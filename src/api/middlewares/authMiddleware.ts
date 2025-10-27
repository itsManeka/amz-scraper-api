import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware
 * Validates API Key from X-API-Key header against environment variable
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const apiKey = req.headers['x-api-key'];

    // Get allowed API keys from environment variable
    const allowedKeys = process.env.API_KEYS;

    // If no keys configured, reject all requests
    if (!allowedKeys || allowedKeys.trim().length === 0) {
        console.warn('[AuthMiddleware] API_KEYS environment variable not configured');
        res.status(401).json({
            error: {
                message: 'Authentication required',
                type: 'AuthenticationError',
                statusCode: 401,
            },
        });
        return;
    }

    // Check if API key was provided
    if (!apiKey || typeof apiKey !== 'string') {
        res.status(401).json({
            error: {
                message: 'API key is required. Please provide X-API-Key header',
                type: 'AuthenticationError',
                statusCode: 401,
            },
        });
        return;
    }

    // Parse allowed keys (comma-separated)
    const keyList = allowedKeys.split(',').map((key) => key.trim());

    // Validate API key
    if (!keyList.includes(apiKey)) {
        res.status(401).json({
            error: {
                message: 'Invalid API key',
                type: 'AuthenticationError',
                statusCode: 401,
            },
        });
        return;
    }

    // API key is valid, proceed to next middleware
    next();
}
