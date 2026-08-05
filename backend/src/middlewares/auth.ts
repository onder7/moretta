import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, AuthRequest } from '../types';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const token =
    req.headers.authorization?.replace('Bearer ', '') ??
    req.cookies?.access_token;

  if (!token) {
    return next(new AppError('Kimlik doğrulama gerekli', 401));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new AppError('Geçersiz veya süresi dolmuş token', 401));
  }
}

export function optionalAuthenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const token =
    req.headers.authorization?.replace('Bearer ', '') ??
    req.cookies?.access_token;

  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      req.user = { id: payload.id, email: payload.email, role: payload.role };
    } catch {
      // invalid token — continue as guest
    }
  }
  next();
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') {
    return next(new AppError('Bu işlem için admin yetkisi gerekli', 403));
  }
  next();
}
