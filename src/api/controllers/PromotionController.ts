import { Request, Response, NextFunction } from 'express';
import { StartPromotionScraping } from '../../application/use-cases/StartPromotionScraping';
import { GetJobStatus } from '../../application/use-cases/GetJobStatus';
import { GetCachedPromotion } from '../../application/use-cases/GetCachedPromotion';
import { ScrapeRequest } from '../../domain/entities/ScrapeRequest';
import { Promotion } from '../../domain/entities/Promotion';

/**
 * Controller for promotion-related endpoints
 */
export class PromotionController {
    constructor(
        private readonly startPromotionScrapingUseCase: StartPromotionScraping,
        private readonly getJobStatusUseCase: GetJobStatus,
        private readonly getCachedPromotionUseCase: GetCachedPromotion
    ) {}

    /**
     * POST /api/promotions/scrape
     * Initiates promotion scraping job
     */
    async startScraping(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { promotionId, category, subcategory } = req.body;

            // Create scrape request
            const scrapeRequest = new ScrapeRequest(
                promotionId,
                category || null,
                subcategory || null
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
}

