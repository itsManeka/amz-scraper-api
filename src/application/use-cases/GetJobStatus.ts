import { Job } from '../../domain/entities/Job';
import { IJobManager } from '../../infrastructure/jobs/IJobManager';

/**
 * Use case for getting job status and results
 * Retrieves information about a running, completed, or failed job
 */
export class GetJobStatus {
    constructor(private readonly jobManager: IJobManager) {}

    /**
     * Executes the use case
     * @param jobId - Job ID
     * @returns Promise resolving to Job entity or null if not found
     * @throws {Error} If job ID is invalid
     */
    async execute<T>(jobId: string): Promise<Job<T> | null> {
        if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
            throw new Error('Job ID is required and must be a non-empty string');
        }

        return await this.jobManager.getJob<T>(jobId.trim());
    }
}
