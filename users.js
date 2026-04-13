const express = require('express');
const cfg = require('../config');
const db = require('./data');
const { authUser } = require('./middleware');

const router = express.Router();

// GET /api/user/profile
router.get('/profile', authUser, async (req, res) => {
  try {
    const u = await db.findUser({ id: req.user.uid });
    if (!u) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });

    const today = new Date().toISOString().split('T')[0];
    if (u.lastReset !== today) {
      await db.updateUser(u.id, { chatCount: 0, lastReset: today });
      u.chatCount = 0;
    }

    return res.json({
      success: true,
      user: {
        uid: u.id, username: u.username, displayName: u.displayName,
        email: u.email, plan: 'free',
        preferences: u.preferences || '',
        chatCount: u.chatCount || 0,
        lastReset: u.lastReset
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PATCH /api/user/profile
router.patch('/profile', authUser, async (req, res) => {
  try {
    const { displayName, preferences } = req.body;
    const update = {};
    if (displayName !== undefined) update.displayName = displayName;
    if (preferences !== undefined) update.preferences = preferences;
    await db.updateUser(req.user.uid, update);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
});

module.exports = router;
