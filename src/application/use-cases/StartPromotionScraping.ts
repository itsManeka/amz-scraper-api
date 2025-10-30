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
                // CRITICAL: Aguardar criação dos child jobs ANTES de completar
                // Isso garante que keep-alive seja mantido e bot veja todos os jobs
                // Retorna os dados reais da promoção extraídos durante a descoberta de subcategorias
                return await this.spawnChildJobs(parentJob.id, request);

                // Parent job completa imediatamente APÓS criação dos childs
                // NÃO aguarda childs completarem (pode demorar horas)
                // Bot consulta child jobs individualmente
                // Retorna dados reais da promoção (descrição, datas, desconto) mas ASINs vazios
            },
            parentMetadata
        );

        console.log(
            `[StartPromotionScraping] Created parent job ${parentJob.id} for promotion ${request.promotionId}`
        );

        return parentJob;
    }

    /**
     * Spawns child jobs for each subcategory (all jobs created immediately)
     * Returns the promotion data extracted during subcategory discovery
     */
    private async spawnChildJobs(parentJobId: string, request: ScrapeRequest): Promise<Promotion> {
        try {
            // Extract subcategories if repository supports it
            let subcategories: string[] = [];
            let promotionData: Promotion | null = null;

            if (
                this.promotionRepository instanceof BrowserPromotionRepository &&
                request.category
            ) {
                const { subcategories: extractedSubcategories, promotion } =
                    await this.promotionRepository.extractSubcategories(
                        request.promotionId,
                        request.category
                    );
                subcategories = extractedSubcategories;
                promotionData = promotion;
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
                `[StartPromotionScraping] Will create ${subcategories.length} child jobs for parent ${parentJobId}`
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

            // Prepare all child job configurations
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

            // Create all jobs immediately (no lazy loading)
            // Bot needs complete list on first query
            await this.createAllJobsImmediately(parentJobId, allJobConfigs, request);

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

            // Return the promotion data extracted during subcategory discovery
            // If no data was extracted, return a placeholder
            return (
                promotionData ||
                new Promotion({
                    id: request.promotionId,
                    description: 'Promotion data not available',
                    details: '',
                    discountType: 'percentage',
                    discountValue: 0,
                    startDate: null,
                    endDate: null,
                    asins: [],
                })
            );
        } catch (error) {
            console.error('[StartPromotionScraping] Failed to spawn child jobs:', error);
            // Return error promotion
            throw error; // Let the parent job executor catch and handle the error
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
}
