import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    req.user = verifyToken(token); // Augment Express.Request in a `types/` declaration
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}
