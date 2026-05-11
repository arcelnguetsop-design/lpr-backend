const { pool } = require('../config/db');

// ── LISTE CLASSES ─────────────────────────────────────────
const getClasses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
              COUNT(e.id) AS total_eleves
       FROM classe c
       LEFT JOIN eleve e ON e.classe_id = c.id AND e.statut = 'actif'
       GROUP BY c.id
       ORDER BY c.nom`
    );
    res.json({ classes: result.rows });
  } catch (err) {
    console.error('Erreur getClasses:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── CRÉER CLASSE ──────────────────────────────────────────
const createClasse = async (req, res) => {
  const { nom, niveau, examen_prepare } = req.body;

  if (!nom || !niveau) {
    return res.status(400).json({ error: 'Nom et niveau obligatoires' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO classe (nom, niveau, examen_prepare)
       VALUES ($1, $2, $3) RETURNING *`,
      [nom, niveau, examen_prepare || null]
    );
    res.status(201).json({ message: 'Classe créée', classe: result.rows[0] });
  } catch (err) {
    console.error('Erreur createClasse:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── MODIFIER CLASSE ───────────────────────────────────────
const updateClasse = async (req, res) => {
  const { id } = req.params;
  const { nom, niveau, examen_prepare } = req.body;

  try {
    const result = await pool.query(
      `UPDATE classe SET
        nom = COALESCE($1, nom),
        niveau = COALESCE($2, niveau),
        examen_prepare = COALESCE($3, examen_prepare)
       WHERE id = $4 RETURNING *`,
      [nom, niveau, examen_prepare, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Classe introuvable' });
    }

    res.json({ message: 'Classe mise à jour', classe: result.rows[0] });
  } catch (err) {
    console.error('Erreur updateClasse:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── SUPPRIMER CLASSE ──────────────────────────────────────
const deleteClasse = async (req, res) => {
  const { id } = req.params;

  try {
    const eleves = await pool.query(
      `SELECT COUNT(*) FROM eleve WHERE classe_id = $1 AND statut != 'archive'`,
      [id]
    );

    if (parseInt(eleves.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer — des élèves actifs sont dans cette classe',
      });
    }

    await pool.query('DELETE FROM classe WHERE id = $1', [id]);
    res.json({ message: 'Classe supprimée' });
  } catch (err) {
    console.error('Erreur deleteClasse:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── MATIÈRES D'UNE CLASSE ─────────────────────────────────
const getMatieresByClasse = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM matiere WHERE classe_id = $1 ORDER BY nom`,
      [id]
    );
    res.json({ matieres: result.rows });
  } catch (err) {
    console.error('Erreur getMatieresByClasse:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── CRÉER MATIÈRE ─────────────────────────────────────────
const createMatiere = async (req, res) => {
  const { nom, coefficient, classe_id } = req.body;

  if (!nom || !classe_id) {
    return res.status(400).json({ error: 'Nom et classe obligatoires' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO matiere (nom, coefficient, classe_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [nom, coefficient || 1, classe_id]
    );
    res.status(201).json({ message: 'Matière créée', matiere: result.rows[0] });
  } catch (err) {
    console.error('Erreur createMatiere:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── SUPPRIMER MATIÈRE ─────────────────────────────────────
const deleteMatiere = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM matiere WHERE id = $1', [id]);
    res.json({ message: 'Matière supprimée' });
  } catch (err) {
    console.error('Erreur deleteMatiere:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  getClasses, createClasse, updateClasse, deleteClasse,
  getMatieresByClasse, createMatiere, deleteMatiere,
};