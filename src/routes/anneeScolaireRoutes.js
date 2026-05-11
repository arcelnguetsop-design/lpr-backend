const express = require('express');
const router  = express.Router();
const {
  getAnnees,
  getAnneeActive,
  createAnnee,
  activerAnnee,
  getStatsByAnnee,
} = require('../controllers/anneeScolaireController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/',            protect, adminOnly, getAnnees);
router.get('/active',      protect, adminOnly, getAnneeActive);
router.post('/',           protect, adminOnly, createAnnee);
router.put('/:id/activer', protect, adminOnly, activerAnnee);
router.get('/:id/stats',   protect, adminOnly, getStatsByAnnee);

module.exports = router;