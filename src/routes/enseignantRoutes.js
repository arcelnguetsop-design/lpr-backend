const express = require('express');
const router  = express.Router();
const {
  getEnseignants,
  updateStatutEnseignant,
  resetPassword,
  getEnseignantById,
} = require('../controllers/enseignantController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Toutes protégées admin
router.get('/',                    protect, adminOnly, getEnseignants);
router.get('/:id',                 protect, adminOnly, getEnseignantById);
router.put('/:id/statut',          protect, adminOnly, updateStatutEnseignant);
router.put('/:id/reset-password',  protect, adminOnly, resetPassword);

module.exports = router;