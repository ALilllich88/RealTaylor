import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const getSecret = () => process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function signToken(): string {
  return jwt.sign({ auth: true }, getSecret(), { expiresIn: '30d' });
}

export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  if (!verifyToken(token)) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  next();
}
