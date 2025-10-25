import { Request, Response, NextFunction } from 'express';
import { IJobManager } from '../../infrastructure/jobs/IJobManager';

/**
 * Controller for health check endpoint
 */
export class HealthController {
    constructor(private readonly jobManager: IJobManager) {}

    /**
     * GET /api/health
     * Returns API health status
     */
    async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const jobStats = await this.jobManager.getStats();

            res.json({
                status: 'ok',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                jobs: {
                    running: jobStats.running,
                    pending: jobStats.pending,
                    completed: jobStats.completed,
                    failed: jobStats.failed,
                    total: jobStats.total,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

