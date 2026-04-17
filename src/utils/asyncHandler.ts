import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Thin wrapper so async route handlers do not need repetitive try/catch blocks.
 */
export function asyncHandler( fn: (req: Request, res: Response, next: NextFunction) => Promise<void> ): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}
