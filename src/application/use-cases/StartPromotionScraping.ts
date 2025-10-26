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
        // Create a job that executes the scraping
        const job = await this.jobManager.createJob<Promotion>('promotion-scraping', async () => {
            return await this.promotionRepository.getPromotionById(
                request.promotionId,
                request.category || undefined,
                request.subcategory || undefined
            );
        });

        return job;
    }
}
