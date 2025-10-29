import { IPromotionRepository } from '../../domain/repositories/IPromotionRepository';
import { ScrapeRequest } from '../../domain/entities/ScrapeRequest';
import { Job } from '../../domain/entities/Job';
import { IJobManager } from '../../infrastructure/jobs/IJobManager';
import { Promotion } from '../../domain/entities/Promotion';
import { BrowserPromotionRepository } from '../../infrastructure/repositories/BrowserPromotionRepository';

/**
 * Use case for starting a promotion scraping job
 * Creates an asynchronous job that scrapes promotion data using Puppeteer
 *
 * If category is provided without subcategory:
 * - Creates a parent orchestrator job
 * - Discovers available subcategories
 * - Creates child jobs for each subcategory (with throttling)
 *
 * If subcategory is provided or no category:
 * - Creates a single scraping job (original behavior)
 */
export class StartPromotionScraping {
    private readonly MAX_CHILD_JOBS = 50; // Safe with GC + delay after extractSubcategories
    private readonly BATCH_PERSISTENCE_SIZE = 5; // Reduced from 10 for better memory management

    constructor(
        private readonly promotionRepository: IPromotionRepository,
        private readonly jobManager: IJobManager
    ) {}

    /**
     * Executes the use case
     * @param request - Scrape request with promotion ID and filters
     * @returns Promise resolving to Job entity (parent job if multi-job, single job otherwise)
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

        // Determine if we should create multi-job (category without subcategory)
        const shouldCreateMultiJob = request.category && !request.subcategory;

        if (shouldCreateMultiJob) {
            return await this.createMultiJobScraping(request);
        } else {
            return await this.createSingleJobScraping(request);
        }
    }

    /**
     * Creates a single scraping job (original behavior)
     */
    private async createSingleJobScraping(request: ScrapeRequest): Promise<Job<Promotion>> {
        // Create metadata for the job
        const metadata = {
            promotionId: request.promotionId,
            category: request.category || undefined,
            subcategory: request.subcategory || undefined,
            maxClicks: request.maxClicks,
        };

        // Create a job that executes the scraping
        const job = await this.jobManager.createJob<Promotion>(
            'promotion-scraping',
            async () => {
                return await this.promotionRepository.getPromotionById(
                    request.promotionId,
                    request.category || undefined,
                    request.subcategory || undefined,
                    request.maxClicks
                );
            },
            metadata
        );

        console.log(
            `[StartPromotionScraping] Created single job ${job.id} for promotion ${request.promotionId}`
        );

        return job;
    }

    /**
     * Creates parent job and child jobs for each subcategory
     */
    private async createMultiJobScraping(request: ScrapeRequest): Promise<Job<Promotion>> {
        console.log(
            `[StartPromotionScraping] Creating multi-job scraping for promotion ${request.promotionId} with category ${request.category}`
        );

        // Create parent orchestrator job
        const parentMetadata = {
            promotionId: request.promotionId,
            category: request.category || undefined,
            subcategory: undefined,
            maxClicks: request.maxClicks,
            childJobIds: [] as string[],
        };

        const parentJob: Job<Promotion> = await this.jobManager.createJob<Promotion>(
            'promotion-scraping-orchestrator',
            async (): Promise<Promotion> => {
                // Parent job executor: wait for all children and aggregate results
                return await this.aggregateChildResults(parentJob.id);
            },
            parentMetadata
        );

        // Extract subcategories (this operation is synchronous for the parent job creation,
        // but the actual extraction happens in a spawned async operation)
        this.spawnChildJobs(parentJob.id, request).catch((error) => {
            console.error('[StartPromotionScraping] Error spawning child jobs:', error);
        });

        console.log(
            `[StartPromotionScraping] Created parent job ${parentJob.id} for promotion ${request.promotionId}`
        );

        return parentJob;
    }

    /**
     * Spawns child jobs for each subcategory (with throttling)
     */
    private async spawnChildJobs(parentJobId: string, request: ScrapeRequest): Promise<void> {
        try {
            // Extract subcategories if repository supports it
            let subcategories: string[] = [];

            if (
                this.promotionRepository instanceof BrowserPromotionRepository &&
                request.category
            ) {
                subcategories = await this.promotionRepository.extractSubcategories(
                    request.promotionId,
                    request.category
                );
            }

            // If no subcategories found, create a single job with the category
            if (subcategories.length === 0) {
                console.log(
                    `[StartPromotionScraping] No subcategories found, creating single job for category`
                );
                subcategories = ['']; // Empty string means no subcategory filter
            }

            // Limit the number of subcategories to prevent server overload
            if (subcategories.length > this.MAX_CHILD_JOBS) {
                console.warn(
                    `[StartPromotionScraping] Found ${subcategories.length} subcategories, limiting to ${this.MAX_CHILD_JOBS} to prevent overload`
                );
                subcategories = subcategories.slice(0, this.MAX_CHILD_JOBS);
            }

            console.log(
                `[StartPromotionScraping] Creating ${subcategories.length} child jobs for parent ${parentJobId}`
            );

            // Prepare all child job configurations
            const childJobConfigs = subcategories.map((subcategory) => ({
                type: 'promotion-scraping',
                executor: async () => {
                    return await this.promotionRepository.getPromotionById(
                        request.promotionId,
                        request.category || undefined,
                        subcategory || undefined,
                        request.maxClicks
                    );
                },
                metadata: {
                    promotionId: request.promotionId,
                    category: request.category || undefined,
                    subcategory: subcategory || undefined,
                    maxClicks: request.maxClicks,
                    parentJobId,
                },
            }));

            // Create child jobs in batches to avoid overwhelming the system
            const allChildJobs: Job<Promotion>[] = [];

            for (let i = 0; i < childJobConfigs.length; i += this.BATCH_PERSISTENCE_SIZE) {
                const batch = childJobConfigs.slice(i, i + this.BATCH_PERSISTENCE_SIZE);
                console.log(
                    `[StartPromotionScraping] Persisting batch ${Math.floor(i / this.BATCH_PERSISTENCE_SIZE) + 1} of ${Math.ceil(childJobConfigs.length / this.BATCH_PERSISTENCE_SIZE)} (${batch.length} jobs)`
                );

                const batchJobs = await this.jobManager.createJobsBatch<Promotion>(batch);
                allChildJobs.push(...batchJobs);

                // Small delay between batches to prevent I/O saturation
                if (i + this.BATCH_PERSISTENCE_SIZE < childJobConfigs.length) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }

            const childJobIds = allChildJobs.map((job) => job.id);

            console.log(
                `[StartPromotionScraping] Successfully created ${childJobIds.length} child jobs in ${Math.ceil(childJobConfigs.length / this.BATCH_PERSISTENCE_SIZE)} batches`
            );

            // Update parent job metadata with child job IDs and persist
            await this.jobManager.updateJobMetadata(parentJobId, {
                promotionId: request.promotionId,
                category: request.category || undefined,
                subcategory: undefined,
                maxClicks: request.maxClicks,
                childJobIds,
            });

            console.log(
                `[StartPromotionScraping] Updated parent job ${parentJobId} with ${childJobIds.length} child job IDs`
            );
        } catch (error) {
            console.error('[StartPromotionScraping] Failed to spawn child jobs:', error);
            // Update parent job with error
            const parentJob = await this.jobManager.getJob(parentJobId);
            if (parentJob) {
                throw error; // Let the parent job executor catch and handle the error
            }
        }
    }

    /**
     * Aggregates results from all child jobs
     */
    private async aggregateChildResults(parentJobId: string): Promise<Promotion> {
        // Wait for child jobs to complete
        const maxWaitTime = 600000; // 10 minutes
        const checkInterval = 5000; // 5 seconds
        let elapsed = 0;

        while (elapsed < maxWaitTime) {
            const parentJob = await this.jobManager.getJob(parentJobId);
            if (!parentJob || !parentJob.metadata?.childJobIds) {
                // Child jobs not yet created, wait
                await new Promise((resolve) => setTimeout(resolve, checkInterval));
                elapsed += checkInterval;
                continue;
            }

            const childJobIds = parentJob.metadata.childJobIds as string[];
            const childJobs = await Promise.all(
                childJobIds.map((id) => this.jobManager.getJob<Promotion>(id))
            );

            // Check if all children are completed
            const allCompleted = childJobs.every((job) => job?.isCompleted());

            if (allCompleted) {
                // Aggregate ASINs from all successful child jobs
                const allAsins = new Set<string>();
                let aggregatedPromotion: Promotion | null = null;

                for (const childJob of childJobs) {
                    if (childJob && childJob.status === 'completed' && childJob.result) {
                        if (!aggregatedPromotion) {
                            aggregatedPromotion = childJob.result;
                        }
                        // Add all ASINs from this child
                        childJob.result.asins.forEach((asin) => allAsins.add(asin));
                    }
                }

                if (!aggregatedPromotion) {
                    throw new Error('All child jobs failed');
                }

                // Create final aggregated promotion with all ASINs
                return new Promotion({
                    ...aggregatedPromotion,
                    asins: Array.from(allAsins),
                });
            }

            // Wait before next check
            await new Promise((resolve) => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;
        }

        throw new Error('Timeout waiting for child jobs to complete');
    }
}
