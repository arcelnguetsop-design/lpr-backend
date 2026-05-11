const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
});

pool.on('connect', () => {
  console.log('✅ Connecté à la base de données Neon.tech');
});

pool.on('error', (err) => {
  console.error('❌ Erreur base de données:', err.message);
});

module.exports = { pool };