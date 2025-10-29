import { v4 as uuidv4 } from 'uuid';
import { Job, JobStatus, JobMetadata } from '../../domain/entities/Job';
import { IJobManager, JobCompletionCallback } from './IJobManager';
import { IStorage } from '../storage/IStorage';
import { StorageKeys } from '../storage/StorageKeys';
import { IKeepAliveService } from '../keepalive/IKeepAliveService';
import { MemoryMonitor } from '../monitoring/MemoryMonitor';

/**
 * In-memory job manager with optional persistent storage
 * Manages job lifecycle and execution
 */
export class JobManager implements IJobManager {
    private jobs: Map<string, Job> = new Map();
    private readonly storage: IStorage | null;
    private readonly maxConcurrentJobs: number;
    private runningJobs = 0;
    private runningParentJobs = 0; // Track running parent jobs for keep-alive control
    private promotionJobCounts: Map<string, number> = new Map(); // Track running jobs per promotion
    private readonly keepAliveService: IKeepAliveService | null;
    private jobCompletionCallbacks: Map<string, JobCompletionCallback[]> = new Map(); // Parent job ID -> callbacks

    constructor(
        storage: IStorage | null = null,
        maxConcurrentJobs: number = 2,
        keepAliveService: IKeepAliveService | null = null
    ) {
        this.storage = storage;
        this.maxConcurrentJobs = maxConcurrentJobs;
        this.keepAliveService = keepAliveService;
    }

    /**
     * Loads jobs from storage
     * Should be called during initialization
     */
    async loadFromStorage(): Promise<void> {
        if (!this.storage) {
            return;
        }

        try {
            const keys = await this.storage.listKeys(StorageKeys.JOB_PREFIX);
            let loadedCount = 0;

            for (const key of keys) {
                try {
                    const jobData = await this.storage.get<Job>(key);
                    if (jobData) {
                        // Recreate Job instance with proper Date objects
                        const job = new Job({
                            ...jobData,
                            createdAt: new Date(jobData.createdAt),
                            startedAt: jobData.startedAt ? new Date(jobData.startedAt) : null,
                            completedAt: jobData.completedAt ? new Date(jobData.completedAt) : null,
                            metadata: jobData.metadata || null,
                        });

                        // Mark running jobs as failed (they didn't complete before shutdown)
                        if (job.isRunning()) {
                            const failedJob = job.withError('Job interrupted by server restart');
                            this.jobs.set(job.id, failedJob);
                            await this.persistJob(failedJob);
                        } else {
                            this.jobs.set(job.id, job);
                        }

                        loadedCount++;
                    }
                } catch (error) {
                    console.error(`[JobManager] Failed to load job: ${key}`, error);
                }
            }

            console.log(`[JobManager] Loaded ${loadedCount} jobs from storage`);
        } catch (error) {
            console.error('[JobManager] Failed to load jobs from storage', error);
        }
    }

    /**
     * Creates a new job and starts execution
     */
    async createJob<T>(
        type: string,
        executor: () => Promise<T>,
        metadata?: JobMetadata
    ): Promise<Job<T>> {
        const jobId = uuidv4();
        const job = new Job<T>({
            id: jobId,
            type,
            status: 'pending',
            createdAt: new Date(),
            metadata: metadata || null,
        });

        this.jobs.set(jobId, job);
        await this.persistJob(job);

        // Start job execution asynchronously
        this.executeJob(jobId, executor).catch((error) => {
            console.error(`[JobManager] Unexpected error in job ${jobId}:`, error);
        });

        return job;
    }

    /**
     * Gets a job by ID
     */
    async getJob<T>(jobId: string): Promise<Job<T> | null> {
        const job = this.jobs.get(jobId);
        return job ? (job as Job<T>) : null;
    }

    /**
     * Finds a job by promotion ID and optional filters
     * Returns existing job if pending, running, or successfully completed
     * Returns null if only failed jobs exist (allowing retry)
     */
    async findJobByPromotion(
        promotionId: string,
        category?: string,
        subcategory?: string
    ): Promise<Job | null> {
        // Find all jobs with matching promotion metadata
        const matchingJobs = Array.from(this.jobs.values()).filter((job) => {
            if (!job.metadata || job.metadata.promotionId !== promotionId) {
                return false;
            }

            // Check category match
            const categoryMatch =
                (category === undefined && job.metadata.category === undefined) ||
                job.metadata.category === category;

            // Check subcategory match
            const subcategoryMatch =
                (subcategory === undefined && job.metadata.subcategory === undefined) ||
                job.metadata.subcategory === subcategory;

            return categoryMatch && subcategoryMatch;
        });

        // If no matching jobs, return null (allow new job)
        if (matchingJobs.length === 0) {
            return null;
        }

        // Check if any non-failed job exists
        const nonFailedJob = matchingJobs.find(
            (job) =>
                job.isPending() ||
                job.isRunning() ||
                (job.status === 'completed' && !job.hasFailed())
        );

        // Return non-failed job if exists, otherwise null (allow retry of failed jobs)
        return nonFailedJob || null;
    }

    /**
     * Finds all jobs by promotion ID
     * Returns all jobs (parent and children) associated with a promotion
     */
    async findJobsByPromotionId(promotionId: string): Promise<Job[]> {
        return Array.from(this.jobs.values()).filter(
            (job) => job.metadata?.promotionId === promotionId
        );
    }

    /**
     * Lists all jobs
     */
    async listJobs(status?: JobStatus): Promise<Job[]> {
        const allJobs = Array.from(this.jobs.values());

        if (status) {
            return allJobs.filter((job) => job.status === status);
        }

        return allJobs;
    }

    /**
     * Cancels a job (only if pending)
     */
    async cancelJob(jobId: string): Promise<boolean> {
        const job = this.jobs.get(jobId);

        if (!job || job.isCompleted()) {
            return false;
        }

        if (job.isPending()) {
            const cancelledJob = job.withError('Job cancelled by user');
            this.jobs.set(jobId, cancelledJob);
            await this.persistJob(cancelledJob);
            return true;
        }

        return false;
    }

    /**
     * Clears completed jobs
     */
    async clearCompletedJobs(olderThanMinutes: number = 60): Promise<void> {
        const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
        const jobsToDelete: string[] = [];

        for (const [jobId, job] of this.jobs.entries()) {
            if (job.isCompleted() && job.completedAt && job.completedAt < cutoffTime) {
                jobsToDelete.push(jobId);
            }
        }

        for (const jobId of jobsToDelete) {
            this.jobs.delete(jobId);
            if (this.storage) {
                await this.storage.delete(StorageKeys.jobKey(jobId));
            }
        }

        console.log(`[JobManager] Cleared ${jobsToDelete.length} completed jobs`);
    }

    /**
     * Gets job statistics
     */
    async getStats(): Promise<{
        pending: number;
        running: number;
        completed: number;
        failed: number;
        total: number;
    }> {
        const jobs = Array.from(this.jobs.values());

        return {
            pending: jobs.filter((j) => j.isPending()).length,
            running: jobs.filter((j) => j.isRunning()).length,
            completed: jobs.filter((j) => j.status === 'completed').length,
            failed: jobs.filter((j) => j.hasFailed()).length,
            total: jobs.length,
        };
    }

    /**
     * Acquires a slot for job execution (prevents race condition)
     * @param jobId - Job ID for logging
     * @param promotionId - Optional promotion ID for fair scheduling
     */
    private async acquireSlot(jobId: string, promotionId?: string): Promise<void> {
        // Wait until a slot is available
        while (this.runningJobs >= this.maxConcurrentJobs) {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Fair scheduling: if this promotion has been waiting and another is running,
            // check if we should prioritize this one
            if (promotionId && this.shouldPrioritizePromotion(promotionId)) {
                // Allow this job to cut in line if its promotion has been waiting
                break;
            }
        }

        // CRITICAL: Increment IMMEDIATELY to prevent race condition
        // Multiple jobs checking the while condition simultaneously must not all pass through
        this.runningJobs++;

        if (promotionId) {
            this.promotionJobCounts.set(
                promotionId,
                (this.promotionJobCounts.get(promotionId) || 0) + 1
            );
        }

        // Log active jobs for monitoring
        console.log(
            `[JobManager] Slot acquired by ${jobId.substring(0, 8)} | Active jobs: ${this.runningJobs}/${this.maxConcurrentJobs}`
        );
    }

    /**
     * Releases a slot after job execution (always called in finally block)
     * @param promotionId - Optional promotion ID for fair scheduling
     */
    private releaseSlot(jobId: string, promotionId?: string): void {
        this.runningJobs--;

        if (promotionId) {
            const count = this.promotionJobCounts.get(promotionId) || 1;
            if (count <= 1) {
                this.promotionJobCounts.delete(promotionId);
            } else {
                this.promotionJobCounts.set(promotionId, count - 1);
            }
        }

        // Log active jobs for monitoring
        console.log(
            `[JobManager] Slot released by ${jobId.substring(0, 8)} | Active jobs: ${this.runningJobs}/${this.maxConcurrentJobs}`
        );
    }

    /**
     * Executes a job with fair scheduling across promotions
     * @param jobId - Job ID
     * @param executor - Function to execute
     */
    private async executeJob<T>(jobId: string, executor: () => Promise<T>): Promise<void> {
        let job = this.jobs.get(jobId) as Job<T>;
        if (!job || job.isCompleted()) {
            return;
        }

        const promotionId = job.metadata?.promotionId;
        const isParentJob = !job.metadata?.parentJobId; // Parent jobs don't have parentJobId

        // Acquire slot (with race condition protection)
        await this.acquireSlot(jobId, promotionId);

        // Track parent jobs for keep-alive control
        if (isParentJob) {
            this.runningParentJobs++;
        }

        try {
            // Activate keep-alive when first parent job starts
            // This ensures monitor stays active throughout all child jobs execution
            if (this.runningParentJobs === 1 && this.keepAliveService) {
                await this.keepAliveService.activate();
            }

            // Mark as running
            job = job.withStatus('running');
            this.jobs.set(jobId, job);
            await this.persistJob(job);

            MemoryMonitor.log(`Job ${jobId.substring(0, 8)} starting`);

            // Execute the job
            const result = await executor();

            // Mark as completed
            job = job.withResult(result);
            this.jobs.set(jobId, job);
            await this.persistJob(job);

            // Notify callbacks (for lazy job creation)
            this.notifyJobCompletion(job);
        } catch (error) {
            // Mark as failed
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            job = job.withError(errorMessage);
            this.jobs.set(jobId, job);
            await this.persistJob(job);

            // Notify callbacks even on failure
            this.notifyJobCompletion(job);
        } finally {
            // CRITICAL: Always release slot in finally block
            this.releaseSlot(jobId, promotionId);

            // Decrement parent job counter
            if (isParentJob) {
                this.runningParentJobs--;
            }

            // Force garbage collection after each job to free Puppeteer memory
            // Critical for memory-constrained environments (Render free tier)
            if (global.gc) {
                MemoryMonitor.forceGC(`Job ${jobId.substring(0, 8)} completed`);
            } else {
                MemoryMonitor.log(`Job ${jobId.substring(0, 8)} completed (no GC available)`);
            }

            // Auto-clean completed child jobs to prevent memory buildup
            // Only clean if this is a child job (has parentJobId) and it's completed
            if (job.metadata?.parentJobId && job.isCompleted()) {
                // Clean jobs older than 5 minutes to keep recent history
                await this.clearCompletedJobs(5);
            }

            // Pause keep-alive only when all parent jobs complete
            // This ensures monitor stays active throughout all child jobs execution
            if (this.runningParentJobs === 0 && this.keepAliveService) {
                await this.keepAliveService.pause();
            }
        }
    }

    /**
     * Determines if a promotion should be prioritized (simple round-robin)
     */
    private shouldPrioritizePromotion(promotionId: string): boolean {
        // If no jobs from this promotion are running but others are, consider prioritizing
        const thisPromotionRunning = this.promotionJobCounts.get(promotionId) || 0;
        const otherPromotionsRunning = Array.from(this.promotionJobCounts.entries())
            .filter(([id]) => id !== promotionId)
            .reduce((sum, [, count]) => sum + count, 0);

        // Simple fairness: if other promotions have been running but not this one
        return thisPromotionRunning === 0 && otherPromotionsRunning > 0;
    }

    /**
     * Updates job metadata and persists to storage
     */
    async updateJobMetadata(jobId: string, metadata: JobMetadata): Promise<boolean> {
        const job = this.jobs.get(jobId);
        if (!job) {
            return false;
        }

        // Create new job with updated metadata (immutable pattern)
        const updatedJob = job.withMetadata(metadata);
        this.jobs.set(jobId, updatedJob);

        // Persist updated job
        await this.persistJob(updatedJob);

        return true;
    }

    /**
     * Creates multiple jobs atomically (all persisted before execution)
     */
    async createJobsBatch<T>(
        jobConfigs: Array<{
            type: string;
            executor: () => Promise<T>;
            metadata?: JobMetadata;
        }>
    ): Promise<Job<T>[]> {
        const jobs: Job<T>[] = [];

        // Phase 1: Create all job instances
        for (const config of jobConfigs) {
            const jobId = uuidv4();
            const job = new Job<T>({
                id: jobId,
                type: config.type,
                status: 'pending',
                createdAt: new Date(),
                metadata: config.metadata || null,
            });

            jobs.push(job);
            this.jobs.set(jobId, job);
        }

        // Phase 2: Persist all jobs atomically
        try {
            await Promise.all(jobs.map((job) => this.persistJob(job)));
        } catch (error) {
            console.error('[JobManager] Failed to persist job batch:', error);
            // Rollback: remove from memory
            for (const job of jobs) {
                this.jobs.delete(job.id);
            }
            throw error;
        }

        // Phase 3: Start execution asynchronously (after all are persisted)
        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            const executor = jobConfigs[i].executor;

            this.executeJob(job.id, executor).catch((error) => {
                console.error(`[JobManager] Unexpected error in batch job ${job.id}:`, error);
            });
        }

        return jobs;
    }

    /**
     * Retries a failed job (only if it was interrupted by server restart)
     */
    async retryJob<T>(jobId: string, executor: () => Promise<T>): Promise<boolean> {
        const job = this.jobs.get(jobId);

        // Only retry if job exists and failed due to server restart
        if (!job || !job.hasFailed()) {
            return false;
        }

        // Check if it was interrupted by server restart
        if (job.error !== 'Job interrupted by server restart') {
            return false;
        }

        // Reset job to pending status (clear result as it will be recomputed)
        const retriedJob = new Job<T>({
            ...job.toJSON(),
            status: 'pending',
            error: null,
            result: null,
        });

        this.jobs.set(jobId, retriedJob);
        await this.persistJob(retriedJob);

        // Start execution
        this.executeJob(jobId, executor).catch((error) => {
            console.error(`[JobManager] Unexpected error retrying job ${jobId}:`, error);
        });

        console.log(`[JobManager] Retrying job ${jobId} after server restart`);

        return true;
    }

    /**
     * Registers a callback to be called when child jobs complete
     * Used for lazy job creation: create more jobs as previous ones finish
     * @param parentJobId - Parent job ID to monitor
     * @param callback - Function to call when a child completes
     */
    registerJobCompletionCallback(parentJobId: string, callback: JobCompletionCallback): void {
        if (!this.jobCompletionCallbacks.has(parentJobId)) {
            this.jobCompletionCallbacks.set(parentJobId, []);
        }
        this.jobCompletionCallbacks.get(parentJobId)!.push(callback);
    }

    /**
     * Unregisters all callbacks for a parent job
     * Should be called when parent job completes
     * @param parentJobId - Parent job ID
     */
    unregisterJobCompletionCallbacks(parentJobId: string): void {
        this.jobCompletionCallbacks.delete(parentJobId);
    }

    /**
     * Notifies callbacks when a job completes
     * @param job - Completed job
     */
    private notifyJobCompletion(job: Job): void {
        const parentJobId = job.metadata?.parentJobId;
        if (!parentJobId) {
            return;
        }

        const callbacks = this.jobCompletionCallbacks.get(parentJobId);
        if (!callbacks || callbacks.length === 0) {
            return;
        }

        const success = job.status === 'completed' && !job.hasFailed();

        // Call all callbacks (they should handle errors internally)
        for (const callback of callbacks) {
            try {
                callback(job.id, success);
            } catch (error) {
                console.error('[JobManager] Error in job completion callback:', error);
            }
        }
    }

    /**
     * Persists a job to storage
     * @param job - Job to persist
     */
    private async persistJob(job: Job): Promise<void> {
        if (!this.storage) {
            return;
        }

        try {
            await this.storage.save(StorageKeys.jobKey(job.id), job.toJSON());
        } catch (error) {
            console.error(`[JobManager] Failed to persist job ${job.id}:`, error);
            throw error; // Re-throw to allow caller to handle
        }
    }
}
