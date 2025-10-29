import { IPromotionRepository } from '../../domain/repositories/IPromotionRepository';
import { ScrapeRequest } from '../../domain/entities/ScrapeRequest';
import { Job } from '../../domain/entities/Job';
import { IJobManager } from '../../infrastructure/jobs/IJobManager';
import { Promotion } from '../../domain/entities/Promotion';
import { BrowserPromotionRepository } from '../../infrastructure/repositories/BrowserPromotionRepository';
import { MemoryMonitor } from '../../infrastructure/monitoring/MemoryMonitor';

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
    private readonly MAX_CHILD_JOBS = 50; // All subcategories - safe with MAX_CONCURRENT_JOBS=1 and GC
    private readonly BATCH_PERSISTENCE_SIZE = 5; // Reduced from 10 for better memory management
    private readonly INITIAL_JOB_BATCH = 10; // Create 10 jobs initially, rest on-demand
    private readonly MIN_PENDING_JOBS = 3; // Create more jobs when pending count drops below this

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
     * Spawns child jobs for each subcategory (with lazy creation for memory efficiency)
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
                `[StartPromotionScraping] Will create up to ${subcategories.length} child jobs for parent ${parentJobId} (${this.INITIAL_JOB_BATCH} initially, rest on-demand)`
            );

            // CRITICAL: Persist complete list of subcategories in parent job metadata
            // This ensures we can recreate missing jobs after crash
            const subcategoryList = subcategories.map((s) => s || '');
            await this.jobManager.updateJobMetadata(parentJobId, {
                promotionId: request.promotionId,
                category: request.category || undefined,
                maxClicks: request.maxClicks,
                subcategories: subcategoryList,
                totalChildrenPlanned: subcategoryList.length,
                childJobIds: [], // Will be populated as jobs are created
            });

            // Prepare all child job configurations (but don't create them all yet)
            const allJobConfigs = subcategories.map((subcategory) => ({
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

            // Use lazy creation if we have many jobs (>15), otherwise create all at once
            if (allJobConfigs.length > 15) {
                await this.createJobsLazily(parentJobId, allJobConfigs, request);
            } else {
                await this.createAllJobsImmediately(parentJobId, allJobConfigs, request);
            }

            MemoryMonitor.log('After job creation setup (before GC)');

            // CRITICAL: Force garbage collection
            if (global.gc) {
                global.gc();
                console.log(
                    '[StartPromotionScraping] Garbage collection triggered after job creation'
                );
            }

            MemoryMonitor.log('After GC - ready for job execution');

            // Give GC time to clean up before execution starts
            await new Promise((resolve) => setTimeout(resolve, 2000));
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
     * Creates all jobs immediately (for small job counts)
     */
    private async createAllJobsImmediately(
        parentJobId: string,
        childJobConfigs: Array<{
            type: string;
            executor: () => Promise<Promotion>;
            metadata: any;
        }>,
        request: ScrapeRequest
    ): Promise<void> {
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
            `[StartPromotionScraping] Successfully created ${childJobIds.length} child jobs immediately`
        );

        // Update parent job metadata with child job IDs
        await this.jobManager.updateJobMetadata(parentJobId, {
            promotionId: request.promotionId,
            category: request.category || undefined,
            subcategory: undefined,
            maxClicks: request.maxClicks,
            childJobIds,
        });
    }

    /**
     * Creates jobs lazily: initial batch + more as jobs complete
     */
    private async createJobsLazily(
        parentJobId: string,
        allJobConfigs: Array<{
            type: string;
            executor: () => Promise<Promotion>;
            metadata: any;
        }>,
        request: ScrapeRequest
    ): Promise<void> {
        const createdJobIds: string[] = [];
        let nextConfigIndex = 0;

        // Helper to create next batch of jobs
        const createNextBatch = async (count: number): Promise<void> => {
            const configsToCreate = allJobConfigs.slice(nextConfigIndex, nextConfigIndex + count);
            if (configsToCreate.length === 0) return;

            console.log(
                `[StartPromotionScraping] Creating next batch: ${configsToCreate.length} jobs (${nextConfigIndex + 1}-${nextConfigIndex + configsToCreate.length} of ${allJobConfigs.length})`
            );

            const newJobs = await this.jobManager.createJobsBatch<Promotion>(configsToCreate);
            const newJobIds = newJobs.map((j) => j.id);
            createdJobIds.push(...newJobIds);
            nextConfigIndex += configsToCreate.length;

            // Update parent metadata with all created job IDs so far
            await this.jobManager.updateJobMetadata(parentJobId, {
                promotionId: request.promotionId,
                category: request.category || undefined,
                subcategory: undefined,
                maxClicks: request.maxClicks,
                childJobIds: createdJobIds,
            });
        };

        // Create initial batch
        await createNextBatch(this.INITIAL_JOB_BATCH);
        console.log(
            `[StartPromotionScraping] Created initial batch of ${this.INITIAL_JOB_BATCH} jobs, will create remaining ${allJobConfigs.length - this.INITIAL_JOB_BATCH} on-demand`
        );

        // Register callback to create more jobs as they complete
        this.jobManager.registerJobCompletionCallback(parentJobId, async (jobId, success) => {
            // Count how many jobs are still pending
            const allJobs = await this.jobManager.findJobsByPromotionId(request.promotionId);
            const childJobs = allJobs.filter((j) => j.metadata?.parentJobId === parentJobId);
            const pendingCount = childJobs.filter((j) => j.isPending()).length;

            console.log(
                `[StartPromotionScraping] Child job ${jobId.substring(0, 8)} completed (success=${success}), pending jobs: ${pendingCount}, remaining configs: ${allJobConfigs.length - nextConfigIndex}`
            );

            // If we're running low on pending jobs and have more configs, create more
            if (pendingCount < this.MIN_PENDING_JOBS && nextConfigIndex < allJobConfigs.length) {
                const batchSize = Math.min(
                    this.BATCH_PERSISTENCE_SIZE,
                    allJobConfigs.length - nextConfigIndex
                );
                await createNextBatch(batchSize);
            }

            // If all jobs are done, clean up callback
            if (nextConfigIndex >= allJobConfigs.length && pendingCount === 0) {
                const runningCount = childJobs.filter((j) => j.isRunning()).length;
                if (runningCount === 0) {
                    console.log(
                        `[StartPromotionScraping] All child jobs completed for parent ${parentJobId}, unregistering callbacks`
                    );
                    this.jobManager.unregisterJobCompletionCallbacks(parentJobId);
                }
            }
        });
    }

    /**
     * Resumes a parent job by creating missing child jobs after server restart
     * @param parentJobId - ID of the parent job to resume
     */
    async resumeParentJob(parentJobId: string): Promise<void> {
        const parentJob = await this.jobManager.getJob(parentJobId);
        if (!parentJob || !parentJob.metadata) {
            console.error(`[StartPromotionScraping] Parent job ${parentJobId} not found`);
            return;
        }

        const metadata = parentJob.metadata;
        const subcategories = (metadata.subcategories as string[]) || [];
        const existingChildJobIds = (metadata.childJobIds as string[]) || [];

        console.log(
            `[StartPromotionScraping] Resuming parent ${parentJobId.substring(0, 8)}: ${existingChildJobIds.length}/${subcategories.length} jobs already created`
        );

        // Identify which subcategories already have jobs
        const existingJobs = await Promise.all(
            existingChildJobIds.map((id) => this.jobManager.getJob(id))
        );
        const createdSubcategories = new Set(
            existingJobs.filter((j) => j !== null).map((j) => j!.metadata?.subcategory || '')
        );

        // Find missing subcategories
        const missingSubcategories = subcategories.filter((sub) => !createdSubcategories.has(sub));

        if (missingSubcategories.length === 0) {
            console.log(
                '[StartPromotionScraping] All child jobs already created, resuming execution'
            );
            return;
        }

        console.log(
            `[StartPromotionScraping] Creating ${missingSubcategories.length} missing child jobs`
        );

        // Create request object from metadata
        const request = new ScrapeRequest(
            metadata.promotionId as string,
            (metadata.category as string) || null,
            null,
            (metadata.maxClicks as number) || 5
        );

        // Prepare job configurations for missing subcategories
        const missingJobConfigs = missingSubcategories.map((subcategory) => ({
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

        // Create jobs in batches
        for (let i = 0; i < missingJobConfigs.length; i += this.BATCH_PERSISTENCE_SIZE) {
            const batch = missingJobConfigs.slice(i, i + this.BATCH_PERSISTENCE_SIZE);
            const newJobs = await this.jobManager.createJobsBatch<Promotion>(batch);
            existingChildJobIds.push(...newJobs.map((j) => j.id));

            console.log(
                `[StartPromotionScraping] Created batch ${Math.floor(i / this.BATCH_PERSISTENCE_SIZE) + 1} of ${Math.ceil(missingJobConfigs.length / this.BATCH_PERSISTENCE_SIZE)} (${batch.length} jobs)`
            );
        }

        // Update parent metadata with all child job IDs
        await this.jobManager.updateJobMetadata(parentJobId, {
            ...metadata,
            childJobIds: existingChildJobIds,
        });

        console.log(
            `[StartPromotionScraping] Successfully resumed parent job ${parentJobId.substring(0, 8)} with ${existingChildJobIds.length} total child jobs`
        );
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
