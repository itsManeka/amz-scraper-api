import { v4 as uuidv4 } from 'uuid';
import { Job, JobStatus, JobMetadata } from '../../domain/entities/Job';
import { IJobManager } from './IJobManager';
import { IStorage } from '../storage/IStorage';
import { StorageKeys } from '../storage/StorageKeys';

/**
 * In-memory job manager with optional persistent storage
 * Manages job lifecycle and execution
 */
export class JobManager implements IJobManager {
    private jobs: Map<string, Job> = new Map();
    private readonly storage: IStorage | null;
    private readonly maxConcurrentJobs: number;
    private runningJobs = 0;

    constructor(storage: IStorage | null = null, maxConcurrentJobs: number = 2) {
        this.storage = storage;
        this.maxConcurrentJobs = maxConcurrentJobs;
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
     * Executes a job
     * @param jobId - Job ID
     * @param executor - Function to execute
     */
    private async executeJob<T>(jobId: string, executor: () => Promise<T>): Promise<void> {
        // Wait if too many jobs are running
        while (this.runningJobs >= this.maxConcurrentJobs) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        let job = this.jobs.get(jobId) as Job<T>;
        if (!job || job.isCompleted()) {
            return;
        }

        try {
            // Mark as running
            this.runningJobs++;
            job = job.withStatus('running');
            this.jobs.set(jobId, job);
            await this.persistJob(job);

            // Execute the job
            const result = await executor();

            // Mark as completed
            job = job.withResult(result);
            this.jobs.set(jobId, job);
            await this.persistJob(job);
        } catch (error) {
            // Mark as failed
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            job = job.withError(errorMessage);
            this.jobs.set(jobId, job);
            await this.persistJob(job);
        } finally {
            this.runningJobs--;
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
        }
    }
}
