import { Job } from '../../domain/entities/Job';
import { IJobManager } from '../../infrastructure/jobs/IJobManager';

/**
 * Overall status for promotion jobs
 */
export type OverallStatus = 'pending' | 'running' | 'completed' | 'partial' | 'failed';

/**
 * Response from GetJobsByPromotionId use case
 */
export interface JobsByPromotionResponse {
    promotionId: string;
    jobs: Job[];
    overallStatus: OverallStatus;
    summary: {
        total: number;
        pending: number;
        running: number;
        completed: number;
        failed: number;
    };
}

/**
 * Use case for getting all jobs associated with a promotion ID
 * Returns all jobs (parent and children) with calculated overall status
 */
export class GetJobsByPromotionId {
    constructor(private readonly jobManager: IJobManager) {}

    /**
     * Executes the use case
     * @param promotionId - Promotion ID
     * @returns Promise resolving to jobs and overall status
     */
    async execute(promotionId: string): Promise<JobsByPromotionResponse> {
        // Find all jobs for this promotion
        const jobs = await this.jobManager.findJobsByPromotionId(promotionId);

        // Calculate summary
        const summary = {
            total: jobs.length,
            pending: jobs.filter((j) => j.isPending()).length,
            running: jobs.filter((j) => j.isRunning()).length,
            completed: jobs.filter((j) => j.status === 'completed').length,
            failed: jobs.filter((j) => j.hasFailed()).length,
        };

        // Calculate overall status
        const overallStatus = this.calculateOverallStatus(summary);

        return {
            promotionId,
            jobs,
            overallStatus,
            summary,
        };
    }

    /**
     * Calculates overall status based on job summary
     * - pending: if any job is pending
     * - running: if any job is running (and none pending)
     * - completed: if all jobs completed successfully
     * - partial: if some succeeded and some failed
     * - failed: if all jobs failed
     */
    private calculateOverallStatus(summary: {
        total: number;
        pending: number;
        running: number;
        completed: number;
        failed: number;
    }): OverallStatus {
        // No jobs found
        if (summary.total === 0) {
            return 'failed';
        }

        // Any job pending
        if (summary.pending > 0) {
            return 'pending';
        }

        // Any job running
        if (summary.running > 0) {
            return 'running';
        }

        // All jobs completed successfully
        if (summary.completed === summary.total) {
            return 'completed';
        }

        // All jobs failed
        if (summary.failed === summary.total) {
            return 'failed';
        }

        // Some succeeded, some failed (partial success)
        return 'partial';
    }
}
