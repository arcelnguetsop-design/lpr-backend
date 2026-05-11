const { pool } = require('../config/db');

// ── INSCRIPTION PUBLIQUE ──────────────────────────────────
const inscrireEleve = async (req, res) => {
  const {
    nom, prenom, date_naissance, lieu_naissance,
    telephone, whatsapp, email, etablissement_origine,
    quartier, classe_id, photo_url,
    parent_nom, parent_telephone, parent_whatsapp,
    parent_email, parent_quartier, parent_ville,
    tuteur_nom, tuteur_telephone, tuteur_whatsapp, tuteur_adresse,
  } = req.body;

  if (!nom || !prenom || !date_naissance || !lieu_naissance ||
      !telephone || !whatsapp || !etablissement_origine ||
      !quartier || !classe_id || !photo_url ||
      !parent_nom || !parent_telephone || !parent_whatsapp) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Récupérer l'année scolaire active
    const anneeResult = await client.query(
      `SELECT id FROM annee_scolaire WHERE active = TRUE LIMIT 1`
    );

    if (!anneeResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Aucune année scolaire active — contactez l\'administrateur',
      });
    }

    const annee_scolaire_id = anneeResult.rows[0].id;

    // Créer le parent
    const parentResult = await client.query(
      `INSERT INTO parent (nom, telephone, whatsapp, email, quartier, ville)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [parent_nom, parent_telephone, parent_whatsapp,
       parent_email || null, parent_quartier || null, parent_ville || null]
    );
    const parent_id = parentResult.rows[0].id;

    // Créer le tuteur si fourni
    let tuteur_id = null;
    if (tuteur_nom && tuteur_telephone) {
      const tuteurResult = await client.query(
        `INSERT INTO tuteur (nom, telephone, whatsapp, adresse)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tuteur_nom, tuteur_telephone,
         tuteur_whatsapp || null, tuteur_adresse || null]
      );
      tuteur_id = tuteurResult.rows[0].id;
    }

    // Créer l'élève avec l'année scolaire
    const eleveResult = await client.query(
      `INSERT INTO eleve (
        nom, prenom, date_naissance, lieu_naissance,
        telephone, whatsapp, email, etablissement_origine,
        quartier, photo_url, classe_id, parent_id, tuteur_id,
        annee_scolaire_id, statut, statut_paiement
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'en_attente','en_attente')
      RETURNING *`,
      [nom, prenom, date_naissance, lieu_naissance,
       telephone, whatsapp, email || null, etablissement_origine,
       quartier, photo_url, classe_id, parent_id, tuteur_id,
       annee_scolaire_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Inscription soumise avec succès. En attente de validation.',
      eleve  : eleveResult.rows[0],
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur inscription:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
};

// ── LISTE ÉLÈVES (admin) ──────────────────────────────────
const getEleves = async (req, res) => {
  const {
    statut, classe_id, search,
    annee_id, page = 1, limit = 20,
  } = req.query;

  const offset     = (page - 1) * limit;
  const conditions = [];
  const params     = [];
  let i = 1;

  // Filtrer par année active par défaut
  if (annee_id) {
    conditions.push(`e.annee_scolaire_id = $${i++}`);
    params.push(annee_id);
  } else {
    conditions.push(
      `e.annee_scolaire_id = (SELECT id FROM annee_scolaire WHERE active = TRUE LIMIT 1)`
    );
  }

  if (statut) {
    conditions.push(`e.statut = $${i++}`);
    params.push(statut);
  }
  if (classe_id) {
    conditions.push(`e.classe_id = $${i++}`);
    params.push(classe_id);
  }
  if (search) {
    conditions.push(
      `(e.nom ILIKE $${i} OR e.prenom ILIKE $${i} OR e.telephone ILIKE $${i})`
    );
    params.push(`%${search}%`);
    i++;
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  try {
    const result = await pool.query(
      `SELECT e.id, e.nom, e.prenom, e.telephone, e.whatsapp,
              e.statut, e.statut_paiement, e.photo_url,
              e.created_at, c.nom AS classe_nom,
              p.nom AS parent_nom, p.telephone AS parent_telephone,
              a.libelle AS annee_scolaire
       FROM eleve e
       LEFT JOIN classe          c ON e.classe_id          = c.id
       LEFT JOIN parent          p ON e.parent_id          = p.id
       LEFT JOIN annee_scolaire  a ON e.annee_scolaire_id  = a.id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    );

    const count = await pool.query(
      `SELECT COUNT(*) FROM eleve e ${where}`, params
    );

    res.json({
      total  : parseInt(count.rows[0].count),
      page   : parseInt(page),
      limit  : parseInt(limit),
      eleves : result.rows,
    });

  } catch (err) {
    console.error('Erreur getEleves:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── FICHE ÉLÈVE COMPLÈTE ──────────────────────────────────
const getEleveById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT e.*,
              c.nom  AS classe_nom,
              a.libelle AS annee_scolaire,
              p.nom      AS parent_nom,
              p.telephone AS parent_telephone,
              p.whatsapp  AS parent_whatsapp,
              p.email     AS parent_email,
              p.quartier  AS parent_quartier,
              p.ville     AS parent_ville,
              t.nom       AS tuteur_nom,
              t.telephone AS tuteur_telephone,
              t.whatsapp  AS tuteur_whatsapp,
              t.adresse   AS tuteur_adresse
       FROM eleve e
       LEFT JOIN classe         c ON e.classe_id         = c.id
       LEFT JOIN annee_scolaire a ON e.annee_scolaire_id = a.id
       LEFT JOIN parent         p ON e.parent_id         = p.id
       LEFT JOIN tuteur         t ON e.tuteur_id         = t.id
       WHERE e.id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Élève introuvable' });
    }

    res.json({ eleve: result.rows[0] });

  } catch (err) {
    console.error('Erreur getEleveById:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── MODIFIER STATUT ───────────────────────────────────────
const updateStatutEleve = async (req, res) => {
  const { id }     = req.params;
  const { statut } = req.body;
  const statuts    = ['en_attente', 'actif', 'inactif', 'archive'];

  if (!statuts.includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  try {
    const result = await pool.query(
      `UPDATE eleve SET statut = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, nom, prenom, statut`,
      [statut, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Élève introuvable' });
    }

    res.json({
      message: `Statut mis à jour : ${statut}`,
      eleve  : result.rows[0],
    });

  } catch (err) {
    console.error('Erreur updateStatut:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── MODIFIER ÉLÈVE ────────────────────────────────────────
const updateEleve = async (req, res) => {
  const { id } = req.params;
  const {
    nom, prenom, telephone, whatsapp, email,
    etablissement_origine, quartier, statut_paiement,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE eleve SET
        nom                   = COALESCE($1,  nom),
        prenom                = COALESCE($2,  prenom),
        telephone             = COALESCE($3,  telephone),
        whatsapp              = COALESCE($4,  whatsapp),
        email                 = COALESCE($5,  email),
        etablissement_origine = COALESCE($6,  etablissement_origine),
        quartier              = COALESCE($7,  quartier),
        statut_paiement       = COALESCE($8,  statut_paiement),
        updated_at            = NOW()
       WHERE id = $9
       RETURNING *`,
      [nom, prenom, telephone, whatsapp, email,
       etablissement_origine, quartier, statut_paiement, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Élève introuvable' });
    }

    res.json({ message: 'Élève mis à jour', eleve: result.rows[0] });

  } catch (err) {
    console.error('Erreur updateEleve:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── STATISTIQUES DASHBOARD ────────────────────────────────
const getStats = async (req, res) => {
  try {
    // Stats élèves année active
    const eleves = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE statut = 'actif')       AS actifs,
        COUNT(*) FILTER (WHERE statut = 'en_attente')  AS en_attente,
        COUNT(*) FILTER (WHERE statut = 'inactif')     AS inactifs,
        COUNT(*) FILTER (WHERE statut = 'archive')     AS archives,
        COUNT(*) FILTER (WHERE statut_paiement = 'en_attente'
                         AND statut = 'actif')         AS paiements_en_attente
       FROM eleve
       WHERE annee_scolaire_id = (
         SELECT id FROM annee_scolaire WHERE active = TRUE LIMIT 1
       )`
    );

    const classes = await pool.query(
      `SELECT COUNT(*) AS total FROM classe`
    );

    const enseignants = await pool.query(
      `SELECT COUNT(*) AS total FROM enseignant WHERE statut = 'actif'`
    );

    const annee = await pool.query(
      `SELECT libelle FROM annee_scolaire WHERE active = TRUE LIMIT 1`
    );

    res.json({
      annee_scolaire : annee.rows[0]?.libelle || 'Non définie',
      eleves         : eleves.rows[0],
      classes        : parseInt(classes.rows[0].total),
      enseignants    : parseInt(enseignants.rows[0].total),
    });

  } catch (err) {
    console.error('Erreur getStats:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  inscrireEleve,
  getEleves,
  getEleveById,
  updateStatutEleve,
  updateEleve,
  getStats,
};