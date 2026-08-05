import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest } from '../types';
import { getMaintenanceConfig } from '../services/settingsService';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export async function maintenanceCheck(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const path = req.path;
  
  // Endpoints that bypass maintenance checks
  const isBypass =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/me') ||
    path.startsWith('/auth/refresh-token') ||
    path.startsWith('/health') ||
    path.startsWith('/maintenance-status') ||
    path.startsWith('/setup') ||
    path.startsWith('/admin');

  if (isBypass) {
    next();
    return;
  }

  try {
    const config = await getMaintenanceConfig();
    if (!config.isActive) {
      next();
      return;
    }

    // Maintenance active — verify if requester is ADMIN
    const token =
      req.headers.authorization?.replace('Bearer ', '') ??
      req.cookies?.access_token;

    if (token) {
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        if (payload.role === 'ADMIN') {
          req.user = { id: payload.id, email: payload.email, role: payload.role };
          next();
          return;
        }
      } catch {
        // Token verification failed, treat as guest
      }
    }

    res.status(503).json({
      success: false,
      maintenance: true,
      message: config.message,
    });
  } catch (err) {
    next(err);
  }
}
