require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const authRoutes          = require('./routes/authRoutes');
const eleveRoutes         = require('./routes/eleveRoutes');
const enseignantRoutes    = require('./routes/enseignantRoutes');
const classeRoutes        = require('./routes/classeRoutes');
const anneeScolaireRoutes = require('./routes/anneeScolaireRoutes');

const app = express();

// ── Sécurité ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*' }));

// ── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez plus tard.' },
});
app.use(limiter);

// ── Body parser ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────
app.use('/api/v1/auth',           authRoutes);
app.use('/api/v1/eleves',         eleveRoutes);
app.use('/api/v1/inscriptions',   eleveRoutes);
app.use('/api/v1/enseignants',    enseignantRoutes);
app.use('/api/v1/classes',        classeRoutes);
app.use('/api/v1/annees',         anneeScolaireRoutes);

// ── Route test ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message : '🎓 API La Porte de la Réussite — opérationnelle',
    version : '1.0.0',
    status  : 'OK',
  });
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// ── Erreurs globales ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.message);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

module.exports = app;