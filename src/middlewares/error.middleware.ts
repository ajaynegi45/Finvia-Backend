// Centralized error handling
import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    statusCode: number;
    code?: string;
    details?: unknown;

    constructor(message: string, statusCode = 500, code?: string, details?: unknown) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
}

export function errorHandler( err: unknown, req: Request, res: Response, next: NextFunction ) {
    if (res.headersSent) {
        return next(err);
    }

    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const message = isAppError ? err.message : 'Internal Server Error';
    const code = isAppError ? err.code ?? 'APP_ERROR' : 'INTERNAL_SERVER_ERROR';

    console.error('Error:', err);

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(isAppError && err.details !== undefined ? { details: err.details } : {}),
        },
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && !isAppError ? {
            stack: err instanceof Error ? err.stack : String(err),
        } : {}),
    });
}
