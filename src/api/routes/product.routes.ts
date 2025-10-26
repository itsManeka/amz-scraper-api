import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { ValidateRequest } from '../middlewares/validateRequest';

/**
 * Creates product routes
 * @param controller - Product controller instance
 * @returns Express router
 */
export function createProductRoutes(controller: ProductController): Router {
    const router = Router();

    /**
     * GET /api/products/:asin
     * Get product information by ASIN
     */
    router.get('/:asin', ValidateRequest.asin, (req, res, next) =>
        controller.getProduct(req, res, next)
    );

    return router;
}
