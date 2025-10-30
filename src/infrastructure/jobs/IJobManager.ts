import { Job, JobStatus, JobMetadata } from '../../domain/entities/Job';

/**
 * Callback for job completion events
 */
export type JobCompletionCallback = (jobId: string, success: boolean) => void;

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
     * Deletes a job from memory and storage
     * Used for manual cleanup of completed jobs
     * @param jobId - Job ID
     * @returns true if deleted, false if not found
     */
    deleteJob(jobId: string): Promise<boolean>;

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

    /**
     * Updates job metadata and persists to storage
     * @param jobId - Job ID
     * @param metadata - Updated metadata
     * @returns true if successful, false if job not found
     */
    updateJobMetadata(jobId: string, metadata: JobMetadata): Promise<boolean>;

    /**
     * Creates multiple jobs atomically (all persisted before execution)
     * @param jobs - Array of job configurations
     * @returns Array of created jobs
     */
    createJobsBatch<T>(
        jobs: Array<{
            type: string;
            executor: () => Promise<T>;
            metadata?: JobMetadata;
        }>
    ): Promise<Job<T>[]>;

    /**
     * Retries a failed job (only if it was interrupted by server restart)
     * @param jobId - Job ID
     * @param executor - Function that executes the job
     * @returns true if job was requeued, false otherwise
     */
    retryJob<T>(jobId: string, executor: () => Promise<T>): Promise<boolean>;

    /**
     * Registers a callback to be called when child jobs complete
     * Used for lazy job creation: create more jobs as previous ones finish
     * @param parentJobId - Parent job ID to monitor
     * @param callback - Function to call when a child completes
     */
    registerJobCompletionCallback(parentJobId: string, callback: JobCompletionCallback): void;

    /**
     * Unregisters all callbacks for a parent job
     * Should be called when parent job completes or is no longer needed
     * @param parentJobId - Parent job ID
     */
    unregisterJobCompletionCallbacks(parentJobId: string): void;
}
