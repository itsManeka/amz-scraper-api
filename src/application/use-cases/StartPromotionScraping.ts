import { IPromotionRepository } from '../../domain/repositories/IPromotionRepository';
import { ScrapeRequest } from '../../domain/entities/ScrapeRequest';
import { Job } from '../../domain/entities/Job';
import { IJobManager } from '../../infrastructure/jobs/IJobManager';
import { Promotion } from '../../domain/entities/Promotion';

/**
 * Use case for starting a promotion scraping job
 * Creates an asynchronous job that scrapes promotion data using Puppeteer
 */
export class StartPromotionScraping {
    constructor(
        private readonly promotionRepository: IPromotionRepository,
        private readonly jobManager: IJobManager
    ) {}

    /**
     * Executes the use case
     * @param request - Scrape request with promotion ID and filters
     * @returns Promise resolving to Job entity
     */
    async execute(request: ScrapeRequest): Promise<Job<Promotion>> {
        // Check for existing job with same promotion ID and filters
        const existingJob = await this.jobManager.findJobByPromotion(
            request.promotionId,
            request.category || undefined,
            request.subcategory || undefined
        );

        // If existing non-failed job found, return it instead of creating new one
        if (existingJob) {
            console.log(
                `[StartPromotionScraping] Found existing job ${existingJob.id} for promotion ${request.promotionId}`
            );
            return existingJob as Job<Promotion>;
        }

        // Create metadata for the job
        const metadata = {
            promotionId: request.promotionId,
            category: request.category || undefined,
            subcategory: request.subcategory || undefined,
        };

        // Create a job that executes the scraping
        const job = await this.jobManager.createJob<Promotion>(
            'promotion-scraping',
            async () => {
                return await this.promotionRepository.getPromotionById(
                    request.promotionId,
                    request.category || undefined,
                    request.subcategory || undefined
                );
            },
            metadata
        );

        console.log(
            `[StartPromotionScraping] Created new job ${job.id} for promotion ${request.promotionId}`
        );

        return job;
    }
}
