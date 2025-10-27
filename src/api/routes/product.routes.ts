import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { ValidateRequest } from '../middlewares/validateRequest';
import { authMiddleware } from '../middlewares/authMiddleware';

/**
 * Creates product routes
 * @param controller - Product controller instance
 * @returns Express router
 */
export function createProductRoutes(controller: ProductController): Router {
    const router = Router();

    // Apply authentication middleware to all routes
    router.use(authMiddleware);

    /**
     * POST /api/products/batch
     * Get multiple products by ASINs (max 10)
     */
    router.post('/batch', ValidateRequest.batchProductRequest, (req, res, next) =>
        controller.getProductsBatch(req, res, next)
    );

    /**
     * GET /api/products/:asin
     * Get product information by ASIN
     */
    router.get('/:asin', ValidateRequest.asin, (req, res, next) =>
        controller.getProduct(req, res, next)
    );

    return router;
}
