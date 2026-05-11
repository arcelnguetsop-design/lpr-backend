const express = require('express');
const router  = express.Router();
const {
  inscrireEleve, getEleves, getEleveById,
  updateStatutEleve, updateEleve, getStats,
} = require('../controllers/eleveController');
const { generateFicheEleve }  = require('../utils/pdfGenerator');
const { generateExcelEleves } = require('../utils/excelExport');
const { pool }                = require('../config/db');
const { protect, adminOnly }  = require('../middleware/authMiddleware');

// ── Public ────────────────────────────────────────────────
router.post('/', inscrireEleve);

// ── Protégées admin ───────────────────────────────────────
router.get('/liste',      protect, adminOnly, getEleves);
router.get('/stats',      protect, adminOnly, getStats);

// ── Export Excel ──────────────────────────────────────────
router.get('/export/excel', protect, adminOnly, async (req, res) => {
  try {
    const { statut, classe_id } = req.query;
    const conditions = [
      `e.annee_scolaire_id = (SELECT id FROM annee_scolaire WHERE active = TRUE LIMIT 1)`
    ];
    const params = [];
    let i = 1;

    if (statut) {
      conditions.push(`e.statut = $${i++}`);
      params.push(statut);
    }
    if (classe_id) {
      conditions.push(`e.classe_id = $${i++}`);
      params.push(classe_id);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await pool.query(
      `SELECT e.nom, e.prenom, e.telephone, e.statut_paiement,
              e.etablissement_origine,
              c.nom AS classe_nom,
              p.nom AS parent_nom,
              p.telephone AS parent_telephone
       FROM eleve e
       LEFT JOIN classe         c ON e.classe_id = c.id
       LEFT JOIN parent         p ON e.parent_id = p.id
       LEFT JOIN annee_scolaire a ON e.annee_scolaire_id = a.id
       ${where}
       ORDER BY c.nom, e.nom`,
      params
    );

    const annee = await pool.query(
      `SELECT libelle FROM annee_scolaire WHERE active = TRUE LIMIT 1`
    );

    await generateExcelEleves(
      result.rows,
      annee.rows[0]?.libelle || '2025-2026',
      res
    );

  } catch (err) {
    console.error('Erreur export Excel:', err.message);
    res.status(500).json({ error: 'Erreur génération Excel' });
  }
});

// ── Fiche PDF individuelle ────────────────────────────────
router.get('/:id/pdf', protect, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*,
              c.nom       AS classe_nom,
              a.libelle   AS annee_scolaire,
              p.nom       AS parent_nom,
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
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Élève introuvable' });
    }

    await generateFicheEleve(result.rows[0], res);

  } catch (err) {
    console.error('Erreur PDF:', err.message);
    res.status(500).json({ error: 'Erreur génération PDF' });
  }
});

// ── CRUD ──────────────────────────────────────────────────
router.get('/:id',        protect, adminOnly, getEleveById);
router.put('/:id',        protect, adminOnly, updateEleve);
router.put('/:id/statut', protect, adminOnly, updateStatutEleve);

module.exports = router;