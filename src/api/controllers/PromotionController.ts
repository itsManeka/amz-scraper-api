import { Request, Response, NextFunction } from 'express';
import { StartPromotionScraping } from '../../application/use-cases/StartPromotionScraping';
import { GetJobStatus } from '../../application/use-cases/GetJobStatus';
import { GetCachedPromotion } from '../../application/use-cases/GetCachedPromotion';
import { GetJobsByPromotionId } from '../../application/use-cases/GetJobsByPromotionId';
import { CleanupPromotionJobs } from '../../application/use-cases/CleanupPromotionJobs';
import { ScrapeRequest } from '../../domain/entities/ScrapeRequest';
import { Promotion } from '../../domain/entities/Promotion';

/**
 * Controller for promotion-related endpoints
 */
export class PromotionController {
    constructor(
        private readonly startPromotionScrapingUseCase: StartPromotionScraping,
        private readonly getJobStatusUseCase: GetJobStatus,
        private readonly getCachedPromotionUseCase: GetCachedPromotion,
        private readonly getJobsByPromotionIdUseCase: GetJobsByPromotionId,
        private readonly cleanupPromotionJobsUseCase: CleanupPromotionJobs
    ) {}

    /**
     * POST /api/promotions/scrape
     * Initiates promotion scraping job
     */
    async startScraping(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { promotionId, category, subcategory, maxClicks } = req.body;

            // Create scrape request
            const scrapeRequest = new ScrapeRequest(
                promotionId,
                category || null,
                subcategory || null,
                maxClicks !== undefined ? Number(maxClicks) : undefined
            );

            // Start scraping job
            const job = await this.startPromotionScrapingUseCase.execute(scrapeRequest);

            res.status(202).json({
                jobId: job.id,
                status: job.status,
                message: 'Promotion scraping job created successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/promotions/jobs/:jobId
     * Gets job status and results
     */
    async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { jobId } = req.params;

            // Get job status
            const job = await this.getJobStatusUseCase.execute<Promotion>(jobId);

            if (!job) {
                res.status(404).json({
                    error: {
                        message: `Job not found: ${jobId}`,
                        type: 'NotFoundError',
                        statusCode: 404,
                    },
                });
                return;
            }

            // Build response based on job status
            if (job.isCompleted() && !job.hasFailed()) {
                res.json({
                    jobId: job.id,
                    status: job.status,
                    result: {
                        promotion: job.result,
                    },
                    completedAt: job.completedAt,
                });
            } else if (job.hasFailed()) {
                res.json({
                    jobId: job.id,
                    status: job.status,
                    error: job.error,
                    completedAt: job.completedAt,
                });
            } else if (job.isRunning()) {
                res.json({
                    jobId: job.id,
                    status: job.status,
                    progress: job.progress,
                    startedAt: job.startedAt,
                });
            } else {
                res.json({
                    jobId: job.id,
                    status: job.status,
                    createdAt: job.createdAt,
                });
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/promotions/:promotionId
     * Gets cached promotion data
     */
    async getCachedPromotion(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { promotionId } = req.params;
            const { category, subcategory } = req.query;

            // Get cached promotion
            const promotion = await this.getCachedPromotionUseCase.execute(
                promotionId,
                category as string | undefined,
                subcategory as string | undefined
            );

            if (!promotion) {
                res.status(404).json({
                    error: {
                        message: 'Promotion not found in cache',
                        type: 'NotFoundError',
                        statusCode: 404,
                    },
                });
                return;
            }

            res.json({
                promotion,
                cached: true,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/promotions/jobs/by-promotion/:promotionId
     * Gets all jobs associated with a promotion
     */
    async getJobsByPromotionId(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { promotionId } = req.params;

            // Get all jobs for this promotion
            const result = await this.getJobsByPromotionIdUseCase.execute(promotionId);

            // If no jobs found
            if (result.jobs.length === 0) {
                res.status(404).json({
                    error: {
                        message: `No jobs found for promotion: ${promotionId}`,
                        type: 'NotFoundError',
                        statusCode: 404,
                    },
                });
                return;
            }

            // Format response
            res.json({
                promotionId: result.promotionId,
                overallStatus: result.overallStatus,
                summary: result.summary,
                jobs: result.jobs.map((job) => ({
                    jobId: job.id,
                    type: job.type,
                    status: job.status,
                    subcategory: job.metadata?.subcategory,
                    parentJobId: job.metadata?.parentJobId,
                    childJobIds: job.metadata?.childJobIds,
                    createdAt: job.createdAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                    progress: job.progress,
                    error: job.error,
                })),
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/promotions/jobs/by-promotion/:promotionId/cleanup
     * Cleans up child jobs while preserving parent job
     */
    async cleanupPromotionJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { promotionId } = req.params;

            const result = await this.cleanupPromotionJobsUseCase.execute(promotionId);

            res.json({
                message: 'Child jobs cleaned up successfully',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }
}
