const express = require('express');
const router  = express.Router();
const { login, registerEnseignant, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public
router.post('/login',                login);
router.post('/register-enseignant',  registerEnseignant);

// Protégé
router.get('/me', protect, getMe);

module.exports = router;