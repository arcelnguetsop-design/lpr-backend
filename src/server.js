require('dotenv').config();

const { pool } = require('./config/db');
const app      = require('./app');

const PORT = process.env.PORT || 3000;

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Base de données inaccessible:', err.message);
    process.exit(1);
  }
  console.log('✅ Base de données OK —', res.rows[0].now);

  app.listen(PORT, () => {
    console.log(`🚀 Serveur LPR démarré sur http://localhost:${PORT}`);
    console.log(`📌 Environnement: ${process.env.NODE_ENV}`);
  });
});