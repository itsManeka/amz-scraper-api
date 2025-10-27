import { Job, JobStatus, JobMetadata } from '../../domain/entities/Job';

/**
 * Job manager interface for managing asynchronous jobs
 */
export interface IJobManager {
    /**
     * Creates a new job
     * @param type - Job type identifier
     * @param executor - Function that executes the job
     * @param metadata - Optional metadata to store with the job
     * @returns Created job
     */
    createJob<T>(type: string, executor: () => Promise<T>, metadata?: JobMetadata): Promise<Job<T>>;

    /**
     * Gets a job by ID
     * @param jobId - Job ID
     * @returns Job or null if not found
     */
    getJob<T>(jobId: string): Promise<Job<T> | null>;

    /**
     * Finds a job by promotion ID and optional filters
     * Returns existing job if pending, running, or successfully completed
     * Returns null if only failed jobs exist (allowing retry)
     * @param promotionId - Promotion ID
     * @param category - Optional category filter
     * @param subcategory - Optional subcategory filter
     * @returns Job or null
     */
    findJobByPromotion(
        promotionId: string,
        category?: string,
        subcategory?: string
    ): Promise<Job | null>;

    /**
     * Finds all jobs by promotion ID
     * Returns all jobs (parent and children) associated with a promotion
     * @param promotionId - Promotion ID
     * @returns Array of jobs
     */
    findJobsByPromotionId(promotionId: string): Promise<Job[]>;

    /**
     * Lists all jobs
     * @param status - Optional status filter
     * @returns Array of jobs
     */
    listJobs(status?: JobStatus): Promise<Job[]>;

    /**
     * Cancels a job (if possible)
     * @param jobId - Job ID
     * @returns true if cancelled, false if not found or already completed
     */
    cancelJob(jobId: string): Promise<boolean>;

    /**
     * Clears completed jobs
     * @param olderThanMinutes - Clear jobs older than specified minutes
     */
    clearCompletedJobs(olderThanMinutes?: number): Promise<void>;

    /**
     * Gets job statistics
     */
    getStats(): Promise<{
        pending: number;
        running: number;
        completed: number;
        failed: number;
        total: number;
    }>;
}
