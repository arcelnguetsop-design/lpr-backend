const { pool } = require('../config/db');

// ── LISTE ANNÉES ──────────────────────────────────────────
const getAnnees = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              COUNT(e.id) AS total_eleves
       FROM annee_scolaire a
       LEFT JOIN eleve e ON e.annee_scolaire_id = a.id
       GROUP BY a.id
       ORDER BY a.date_debut DESC`
    );
    res.json({ annees: result.rows });
  } catch (err) {
    console.error('Erreur getAnnees:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── ANNÉE ACTIVE ──────────────────────────────────────────
const getAnneeActive = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM annee_scolaire WHERE active = TRUE LIMIT 1`
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Aucune année scolaire active' });
    }

    res.json({ annee: result.rows[0] });
  } catch (err) {
    console.error('Erreur getAnneeActive:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── CRÉER ANNÉE ───────────────────────────────────────────
const createAnnee = async (req, res) => {
  const { libelle, date_debut, date_fin } = req.body;

  if (!libelle || !date_debut || !date_fin) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }

  // Vérifier format libelle (ex: 2025-2026)
  const format = /^\d{4}-\d{4}$/;
  if (!format.test(libelle)) {
    return res.status(400).json({
      error: 'Format libelle invalide — exemple : 2025-2026',
    });
  }

  try {
    const existing = await pool.query(
      `SELECT id FROM annee_scolaire WHERE libelle = $1`, [libelle]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Cette année scolaire existe déjà' });
    }

    const result = await pool.query(
      `INSERT INTO annee_scolaire (libelle, date_debut, date_fin, active)
       VALUES ($1, $2, $3, FALSE) RETURNING *`,
      [libelle, date_debut, date_fin]
    );

    res.status(201).json({
      message: 'Année scolaire créée',
      annee  : result.rows[0],
    });
  } catch (err) {
    console.error('Erreur createAnnee:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── ACTIVER UNE ANNÉE ─────────────────────────────────────
const activerAnnee = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Désactiver toutes les années
    await client.query(
      `UPDATE annee_scolaire SET active = FALSE`
    );

    // Activer la nouvelle
    const result = await client.query(
      `UPDATE annee_scolaire SET active = TRUE
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Année scolaire introuvable' });
    }

    await client.query('COMMIT');

    res.json({
      message: `Année ${result.rows[0].libelle} activée avec succès`,
      annee  : result.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur activerAnnee:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
};

// ── STATS PAR ANNÉE ───────────────────────────────────────
const getStatsByAnnee = async (req, res) => {
  const { id } = req.params;

  try {
    const annee = await pool.query(
      `SELECT * FROM annee_scolaire WHERE id = $1`, [id]
    );

    if (!annee.rows[0]) {
      return res.status(404).json({ error: 'Année scolaire introuvable' });
    }

    const stats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE statut = 'actif')      AS actifs,
        COUNT(*) FILTER (WHERE statut = 'en_attente') AS en_attente,
        COUNT(*) FILTER (WHERE statut = 'inactif')    AS inactifs,
        COUNT(*) FILTER (WHERE statut = 'archive')    AS archives
       FROM eleve
       WHERE annee_scolaire_id = $1`,
      [id]
    );

    const parClasse = await pool.query(
      `SELECT c.nom AS classe, COUNT(e.id) AS total
       FROM eleve e
       JOIN classe c ON e.classe_id = c.id
       WHERE e.annee_scolaire_id = $1 AND e.statut = 'actif'
       GROUP BY c.nom
       ORDER BY c.nom`,
      [id]
    );

    res.json({
      annee    : annee.rows[0],
      stats    : stats.rows[0],
      classes  : parClasse.rows,
    });
  } catch (err) {
    console.error('Erreur getStatsByAnnee:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  getAnnees,
  getAnneeActive,
  createAnnee,
  activerAnnee,
  getStatsByAnnee,
};