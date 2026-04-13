const jwt = require('jsonwebtoken');
const cfg = require('../config');

function authUser(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token tidak ada.' });
  try {
    req.user = jwt.verify(token, cfg.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Token expired, login ulang.' });
  }
}

module.exports = { authUser };
