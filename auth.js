// ============================
// AlterAi - Auth Routes
// ============================

const express = require('express');
const jwt = require('jsonwebtoken');
const cfg = require('../config');
const db = require('./data');

const router = express.Router();

// Rate limit in-memory
const attempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const data = attempts.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > data.resetAt) { data.count = 0; data.resetAt = now + 60000; }
  data.count++;
  attempts.set(ip, data);
  return data.count > 10;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    if (checkRateLimit(ip)) return res.status(429).json({ success: false, message: 'Terlalu banyak request.' });

    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password || !displayName)
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password min 6 karakter.' });
    if (!/^[a-z0-9_]+$/.test(username.toLowerCase()))
      return res.status(400).json({ success: false, message: 'Username hanya huruf kecil, angka, underscore.' });
    if (username.length < 3 || username.length > 20)
      return res.status(400).json({ success: false, message: 'Username 3-20 karakter.' });

    const [existUser, existEmail] = await Promise.all([
      db.findUser({ username: username.toLowerCase() }),
      db.findUser({ email: email.toLowerCase() })
    ]);
    if (existUser) return res.status(409).json({ success: false, message: 'Username sudah digunakan.' });
    if (existEmail) return res.status(409).json({ success: false, message: 'Email sudah terdaftar.' });

    const hash = Buffer.from(password + cfg.JWT_SECRET).toString('base64');
    const today = new Date().toISOString().split('T')[0];

    const user = await db.createUser({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      displayName,
      password: hash,
      plan: 'free',
      preferences: '',
      chatCount: 0,
      lastReset: today
    });

    const token = jwt.sign(
      { uid: user.id, username: user.username, displayName: user.displayName, plan: 'free', role: 'user' },
      cfg.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true, token,
      user: { uid: user.id, username: user.username, displayName: user.displayName, plan: 'free' }
    });
  } catch (e) {
    console.error('register:', e.message);
    return res.status(500).json({ success: false, message: 'Server error: ' + e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    if (checkRateLimit(ip)) return res.status(429).json({ success: false, message: 'Terlalu banyak request.' });

    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Isi semua field.' });

    const u = await db.findUser({ username: username.toLowerCase() });
    if (!u) return res.status(401).json({ success: false, message: 'Username atau password salah.' });

    const hash = Buffer.from(password + cfg.JWT_SECRET).toString('base64');
    if (hash !== u.password)
      return res.status(401).json({ success: false, message: 'Username atau password salah.' });

    const token = jwt.sign(
      { uid: u.id, username: u.username, displayName: u.displayName, plan: u.plan, role: 'user' },
      cfg.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true, token,
      user: { uid: u.id, username: u.username, displayName: u.displayName, plan: u.plan }
    });
  } catch (e) {
    console.error('login:', e.message);
    return res.status(500).json({ success: false, message: 'Server error: ' + e.message });
  }
});

module.exports = router;
