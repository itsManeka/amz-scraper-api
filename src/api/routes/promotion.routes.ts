import { Router } from 'express';
import { PromotionController } from '../controllers/PromotionController';
import { ValidateRequest } from '../middlewares/validateRequest';
import { authMiddleware } from '../middlewares/authMiddleware';

/**
 * Creates promotion routes
 * @param controller - Promotion controller instance
 * @returns Express router
 */
export function createPromotionRoutes(controller: PromotionController): Router {
    const router = Router();

    // Apply authentication middleware to all routes
    router.use(authMiddleware);

    /**
     * POST /api/promotions/scrape
     * Start a promotion scraping job
     */
    router.post('/scrape', ValidateRequest.scrapeRequest, (req, res, next) =>
        controller.startScraping(req, res, next)
    );

    /**
     * GET /api/promotions/jobs/:jobId
     * Get job status and results
     */
    router.get('/jobs/:jobId', ValidateRequest.jobId, (req, res, next) =>
        controller.getJobStatus(req, res, next)
    );

    /**
     * GET /api/promotions/:promotionId
     * Get cached promotion data
     */
    router.get('/:promotionId', ValidateRequest.promotionId, (req, res, next) =>
        controller.getCachedPromotion(req, res, next)
    );

    return router;
}
