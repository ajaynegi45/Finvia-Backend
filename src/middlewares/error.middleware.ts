// Centralized error handling
import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    statusCode: number;
    code?: string;

    constructor(message: string, statusCode = 500, code?: string) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler( err: unknown, req: Request, res: Response, next: NextFunction ) {
    if (res.headersSent) {
        return next(err);
    }

    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const message = isAppError ? err.message : 'Internal Server Error';

    console.error('Error:', err);

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && {
            error: err,
        }),
    });
}