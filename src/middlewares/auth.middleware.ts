import type { NextFunction, Request, Response } from 'express';
import { AppError } from './error.middleware';

const PAY_ALLOWED_ROLES = new Set(['admin', 'finance']);

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const actorId = req.header('x-user-id')?.trim();
  const actorRole = req.header('x-user-role')?.trim().toLowerCase();

  if (!actorId) {
    return next(new AppError('Missing x-user-id header', 401, 'UNAUTHORIZED'));
  }

  if (!actorRole) {
    return next(new AppError('Missing x-user-role header', 401, 'UNAUTHORIZED'));
  }

  req.actorId = actorId;
  req.actorRole = actorRole;
  next();
}

export function requirePayRole(req: Request, res: Response, next: NextFunction) {
  if (!req.actorRole) {
    return next(new AppError('Missing authenticated role', 401, 'UNAUTHORIZED'));
  }

  if (!PAY_ALLOWED_ROLES.has(req.actorRole)) {
    return next(new AppError('Only finance or admin users can mark invoices as paid', 403, 'FORBIDDEN'));
  }

  next();
}
