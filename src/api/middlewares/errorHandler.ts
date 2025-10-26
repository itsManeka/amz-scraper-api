import { Request, Response, NextFunction } from 'express';
import {
    ScraperError,
    HttpError,
    ParsingError,
    ProductNotFoundError,
} from '../../infrastructure/errors/ScraperError';

/**
 * Error response interface
 */
interface ErrorResponse {
    error: {
        message: string;
        type: string;
        statusCode: number;
        details?: unknown;
    };
}

/**
 * Global error handler middleware
 * Converts errors to appropriate HTTP responses
 */
export function errorHandler(
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error('[ErrorHandler]', error);

    // Handle scraper-specific errors
    if (error instanceof ProductNotFoundError) {
        const response: ErrorResponse = {
            error: {
                message: error.message,
                type: 'ProductNotFoundError',
                statusCode: 404,
                details: { asin: error.asin },
            },
        };
        res.status(404).json(response);
        return;
    }

    if (error instanceof HttpError) {
        const response: ErrorResponse = {
            error: {
                message: error.message,
                type: 'HttpError',
                statusCode: error.statusCode || 500,
                details: { httpStatusCode: error.statusCode },
            },
        };
        res.status(500).json(response);
        return;
    }

    if (error instanceof ParsingError) {
        const response: ErrorResponse = {
            error: {
                message: error.message,
                type: 'ParsingError',
                statusCode: 500,
            },
        };
        res.status(500).json(response);
        return;
    }

    if (error instanceof ScraperError) {
        const response: ErrorResponse = {
            error: {
                message: error.message,
                type: 'ScraperError',
                statusCode: 500,
            },
        };
        res.status(500).json(response);
        return;
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
        const response: ErrorResponse = {
            error: {
                message: error.message,
                type: 'ValidationError',
                statusCode: 400,
            },
        };
        res.status(400).json(response);
        return;
    }

    // Handle generic errors
    const response: ErrorResponse = {
        error: {
            message: error.message || 'Internal server error',
            type: error.name || 'Error',
            statusCode: 500,
        },
    };
    res.status(500).json(response);
}
