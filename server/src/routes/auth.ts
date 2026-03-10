import { Router } from 'express';
import { signToken, verifyToken } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { pin } = req.body as { pin: string };
  const appPin = process.env.APP_PIN || '1234';
  if (pin === appPin) {
    const token = signToken();
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid PIN' });
  }
});

// GET /api/auth/verify
router.get('/verify', authMiddleware, (_req, res) => {
  res.json({ valid: true });
});

export default router;
