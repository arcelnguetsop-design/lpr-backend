const express = require('express');
const router  = express.Router();
const {
  getClasses, createClasse, updateClasse, deleteClasse,
  getMatieresByClasse, createMatiere, deleteMatiere,
} = require('../controllers/classeController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/',                    protect, adminOnly, getClasses);
router.post('/',                   protect, adminOnly, createClasse);
router.put('/:id',                 protect, adminOnly, updateClasse);
router.delete('/:id',              protect, adminOnly, deleteClasse);
router.get('/:id/matieres',        protect, adminOnly, getMatieresByClasse);
router.post('/matieres',           protect, adminOnly, createMatiere);
router.delete('/matieres/:id',     protect, adminOnly, deleteMatiere);

module.exports = router;