import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware for protected routes
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }
    
    const token = parts[1];
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'secret'
    ) as JwtPayload;
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Super admin only middleware
 */
export function superAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  
  next();
}
