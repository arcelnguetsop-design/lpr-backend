const { pool }  = require('../config/db');
const bcrypt    = require('bcryptjs');

// ── LISTE ENSEIGNANTS ─────────────────────────────────────
const getEnseignants = async (req, res) => {
  const { statut } = req.query;
  const conditions = [];
  const params     = [];

  if (statut) {
    conditions.push(`statut = $1`);
    params.push(statut);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const result = await pool.query(
      `SELECT id, nom, prenom, email, telephone, statut, created_at
       FROM enseignant
       ${where}
       ORDER BY created_at DESC`,
      params
    );

    res.json({ enseignants: result.rows });

  } catch (err) {
    console.error('Erreur getEnseignants:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── MODIFIER STATUT ENSEIGNANT ────────────────────────────
const updateStatutEnseignant = async (req, res) => {
  const { id }     = req.params;
  const { statut } = req.body;
  const statuts    = ['en_attente', 'actif', 'desactive'];

  if (!statuts.includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  try {
    const result = await pool.query(
      `UPDATE enseignant SET statut = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, nom, prenom, email, statut`,
      [statut, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Enseignant introuvable' });
    }

    res.json({
      message    : `Compte ${statut === 'actif' ? 'activé' : 'désactivé'} avec succès`,
      enseignant : result.rows[0],
    });

  } catch (err) {
    console.error('Erreur updateStatutEnseignant:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── RESET MOT DE PASSE ────────────────────────────────────
const resetPassword = async (req, res) => {
  const { id }           = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe minimum 6 caractères' });
  }

  try {
    const password_hash = await bcrypt.hash(new_password, 12);

    const result = await pool.query(
      `UPDATE enseignant SET password_hash = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, nom, prenom, email`,
      [password_hash, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Enseignant introuvable' });
    }

    res.json({
      message    : 'Mot de passe réinitialisé avec succès',
      enseignant : result.rows[0],
    });

  } catch (err) {
    console.error('Erreur resetPassword:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── FICHE ENSEIGNANT ──────────────────────────────────────
const getEnseignantById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, nom, prenom, email, telephone, statut, created_at
       FROM enseignant WHERE id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Enseignant introuvable' });
    }

    res.json({ enseignant: result.rows[0] });

  } catch (err) {
    console.error('Erreur getEnseignantById:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  getEnseignants,
  updateStatutEnseignant,
  resetPassword,
  getEnseignantById,
};