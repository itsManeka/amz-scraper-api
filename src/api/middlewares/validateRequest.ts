import { Request, Response, NextFunction } from 'express';

/**
 * Request validation middleware
 * Validates common request parameters
 */
export class ValidateRequest {
    /**
     * Validates ASIN parameter
     */
    static asin(req: Request, res: Response, next: NextFunction): void {
        const { asin } = req.params;

        if (!asin || typeof asin !== 'string') {
            res.status(400).json({
                error: {
                    message: 'ASIN parameter is required',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            return;
        }

        const asinTrimmed = asin.trim();

        if (asinTrimmed.length !== 10 || !/^[A-Z0-9]{10}$/i.test(asinTrimmed)) {
            res.status(400).json({
                error: {
                    message: 'ASIN must be exactly 10 alphanumeric characters',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            return;
        }

        next();
    }

    /**
     * Validates promotion ID parameter
     */
    static promotionId(req: Request, res: Response, next: NextFunction): void {
        const { promotionId } = req.params;

        if (!promotionId || typeof promotionId !== 'string') {
            res.status(400).json({
                error: {
                    message: 'Promotion ID parameter is required',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            return;
        }

        const promotionIdTrimmed = promotionId.trim();

        if (promotionIdTrimmed.length === 0 || !/^[A-Z0-9]+$/i.test(promotionIdTrimmed)) {
            res.status(400).json({
                error: {
                    message: 'Promotion ID must contain only alphanumeric characters',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            return;
        }

        next();
    }

    /**
     * Validates job ID parameter
     */
    static jobId(req: Request, res: Response, next: NextFunction): void {
        const { jobId } = req.params;

        if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
            res.status(400).json({
                error: {
                    message: 'Job ID parameter is required',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            return;
        }

        next();
    }

    /**
     * Validates scrape request body
     */
    static scrapeRequest(req: Request, res: Response, next: NextFunction): void {
        const { promotionId, category, subcategory } = req.body;

        if (!promotionId || typeof promotionId !== 'string' || promotionId.trim().length === 0) {
            res.status(400).json({
                error: {
                    message: 'promotionId is required and must be a non-empty string',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            return;
        }

        if (!/^[A-Z0-9]+$/i.test(promotionId.trim())) {
            res.status(400).json({
                error: {
                    message: 'promotionId must contain only alphanumeric characters',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            return;
        }

        if (category !== undefined && (typeof category !== 'string' || category.trim().length === 0)) {
            res.status(400).json({
                error: {
                    message: 'category must be a non-empty string if provided',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            return;
        }

        if (subcategory !== undefined && (typeof subcategory !== 'string' || subcategory.trim().length === 0)) {
            res.status(400).json({
                error: {
                    message: 'subcategory must be a non-empty string if provided',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            return;
        }

        if (subcategory && !category) {
            res.status(400).json({
                error: {
                    message: 'subcategory cannot be specified without a category',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            return;
        }

        next();
    }
}

