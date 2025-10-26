import { Job, JobStatus } from '../../domain/entities/Job';

/**
 * Job manager interface for managing asynchronous jobs
 */
export interface IJobManager {
    /**
     * Creates a new job
     * @param type - Job type identifier
     * @param executor - Function that executes the job
     * @returns Created job
     */
    createJob<T>(type: string, executor: () => Promise<T>): Promise<Job<T>>;

    /**
     * Gets a job by ID
     * @param jobId - Job ID
     * @returns Job or null if not found
     */
    getJob<T>(jobId: string): Promise<Job<T> | null>;

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
