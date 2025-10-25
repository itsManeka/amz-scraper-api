import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

/**
 * Creates health check routes
 * @param controller - Health controller instance
 * @returns Express router
 */
export function createHealthRoutes(controller: HealthController): Router {
    const router = Router();

    /**
     * GET /api/health
     * Health check endpoint
     */
    router.get('/', (req, res, next) => controller.getHealth(req, res, next));

    return router;
}

