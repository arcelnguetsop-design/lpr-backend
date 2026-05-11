const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès refusé — token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé à l\'administrateur' });
  }
  next();
};

const enseignantOnly = (req, res, next) => {
  if (!['admin', 'enseignant'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }
  next();
};

module.exports = { protect, adminOnly, enseignantOnly };