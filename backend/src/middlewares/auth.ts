import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      data: null,
      error: '401_UNAUTHORIZED',
      meta: {
        requestId: req.headers['x-request-id'] || '',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      data: null,
      error: '401_UNAUTHORIZED',
      meta: {
        requestId: req.headers['x-request-id'] || '',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
