const express = require('express');
const { z } = require('zod');
const authService = require('../../services/authService');
const { requireAuth } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);
    const { token, user } = await authService.login(identifier, password);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
// JWTs are stateless, so logout is handled client-side by discarding the
// token. This endpoint exists for API symmetry and future token blacklisting.
router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
