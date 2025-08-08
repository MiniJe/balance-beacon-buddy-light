import { Request, Response, NextFunction } from 'express';
import { ApiResponseHelper } from '../types/api.types';

/**
 * Interfață pentru erori custom cu cod de status
 */
export class AppError extends Error {
    public statusCode: number;
    public errorCode: string;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500, errorCode: string = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Middleware pentru tratarea erorilor globale
 */
export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'A apărut o eroare internă';

    // Logăm eroarea pentru debugging
    console.error('Eroare capturată de middleware:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Verificăm tipul erorii pentru a determina răspunsul corespunzător
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        errorCode = err.errorCode;
        message = err.message;
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
        message = 'Acces neautorizat';
    } else if (err.message.includes('ECONNREFUSED')) {
        statusCode = 503;
        errorCode = 'DATABASE_CONNECTION_ERROR';
        message = 'Eroare de conexiune la baza de date';
    } else if (err.message.includes('Timeout')) {
        statusCode = 408;
        errorCode = 'REQUEST_TIMEOUT';
        message = 'Cererea a expirat';
    } else {
        // Pentru erori necunoscute, nu expunem detalii în producție
        if (process.env.NODE_ENV === 'production') {
            message = 'A apărut o eroare internă';
        } else {
            message = err.message;
        }
    }

    // Construim răspunsul folosind helper-ul standardizat
    const response = ApiResponseHelper.error(
        message,
        errorCode,
        process.env.NODE_ENV === 'development' ? err.message : undefined,
        undefined,
        process.env.NODE_ENV === 'development'
    );

    res.status(statusCode).json(response);
};

/**
 * Middleware pentru tratarea rutelor inexistente (404)
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
    const message = `Ruta ${req.method} ${req.originalUrl} nu a fost găsită`;
    res.status(404).json(ApiResponseHelper.notFoundError('Ruta'));
};

/**
 * Helper functions pentru aruncarea erorilor custom
 */
export const throwValidationError = (message: string, field?: string): never => {
    const error = new AppError(message, 400, 'VALIDATION_ERROR');
    if (field) {
        (error as any).field = field;
    }
    throw error;
};

export const throwNotFoundError = (resource: string = 'Resursa'): never => {
    throw new AppError(`${resource} nu a fost găsită`, 404, 'NOT_FOUND_ERROR');
};

export const throwUnauthorizedError = (message: string = 'Acces neautorizat'): never => {
    throw new AppError(message, 401, 'UNAUTHORIZED_ERROR');
};

export const throwForbiddenError = (message: string = 'Acces interzis'): never => {
    throw new AppError(message, 403, 'FORBIDDEN_ERROR');
};

/**
 * Wrapper pentru funcții async pentru a captura automat erorile
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
