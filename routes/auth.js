const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { findAdminByUsername } = require('../db/database');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const admin = findAdminByUsername(username);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create session
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;

    res.json({
      message: 'Login successful',
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
      },
    });
  }
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.json({
      authenticated: true,
      admin: {
        id: req.session.adminId,
        username: req.session.adminUsername,
      },
    });
  }
  res.json({ authenticated: false });
});

module.exports = router;
