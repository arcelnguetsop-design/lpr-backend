const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/db');

// ── Générer un token JWT ──────────────────────────────────
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
};

// ── LOGIN (admin + enseignant) ────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    // Chercher dans admin
    let result = await pool.query(
      'SELECT * FROM admin WHERE email = $1', [email]
    );

    let user = result.rows[0];
    let role = 'admin';

    // Si pas trouvé dans admin, chercher dans enseignant
    if (!user) {
      result = await pool.query(
        'SELECT * FROM enseignant WHERE email = $1', [email]
      );
      user = result.rows[0];
      role = 'enseignant';
    }

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier statut enseignant
    if (role === 'enseignant' && user.statut !== 'actif') {
      return res.status(403).json({
        error: 'Compte en attente de validation par l\'administrateur',
      });
    }

    // Vérifier mot de passe
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer token
    const token = generateToken({
      id   : user.id,
      email: user.email,
      role,
      nom  : user.nom,
    });

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id    : user.id,
        nom   : user.nom,
        email : user.email,
        role,
      },
    });

  } catch (err) {
    console.error('Erreur login:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── REGISTER ENSEIGNANT (auto-inscription) ────────────────
const registerEnseignant = async (req, res) => {
  const { nom, prenom, email, telephone, password } = req.body;

  if (!nom || !prenom || !email || !telephone || !password) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe minimum 6 caractères' });
  }

  try {
    // Vérifier email existant
    const existing = await pool.query(
      'SELECT id FROM enseignant WHERE email = $1', [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const password_hash = await bcrypt.hash(password, 12);

    // Créer le compte
    const result = await pool.query(
      `INSERT INTO enseignant (nom, prenom, email, telephone, password_hash, statut)
       VALUES ($1, $2, $3, $4, $5, 'en_attente')
       RETURNING id, nom, prenom, email, telephone, statut, created_at`,
      [nom, prenom, email, telephone, password_hash]
    );

    const enseignant = result.rows[0];

    res.status(201).json({
      message: 'Compte créé avec succès. En attente de validation par l\'administrateur.',
      enseignant,
    });

  } catch (err) {
    console.error('Erreur register:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ── MON PROFIL ────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    const table = role === 'admin' ? 'admin' : 'enseignant';

    const result = await pool.query(
      `SELECT id, nom, email FROM ${table} WHERE id = $1`, [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json({ user: { ...result.rows[0], role } });

  } catch (err) {
    console.error('Erreur getMe:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { login, registerEnseignant, getMe };