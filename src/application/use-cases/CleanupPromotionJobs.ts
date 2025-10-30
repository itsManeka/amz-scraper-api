import { IJobManager } from '../../infrastructure/jobs/IJobManager';

/**
 * Response from CleanupPromotionJobs use case
 */
export interface CleanupPromotionJobsResponse {
    promotionId: string;
    deletedChildJobs: number;
    parentJobPreserved: boolean;
}

/**
 * Use case for cleaning up child jobs of a promotion
 * Deletes all child jobs but preserves the parent job as a "flag"
 * indicating the promotion has already been scraped
 */
export class CleanupPromotionJobs {
    constructor(private readonly jobManager: IJobManager) {}

    /**
     * Executes the cleanup
     * @param promotionId - Promotion ID to cleanup
     * @returns Promise resolving to cleanup result
     */
    async execute(promotionId: string): Promise<CleanupPromotionJobsResponse> {
        // Find all jobs for this promotion
        const jobs = await this.jobManager.findJobsByPromotionId(promotionId);

        // Separate parent and child jobs
        const parentJob = jobs.find((j) => !j.metadata?.parentJobId);
        const childJobs = jobs.filter((j) => j.metadata?.parentJobId);

        if (!parentJob) {
            throw new Error(`No parent job found for promotion ${promotionId}`);
        }

        console.log(
            `[CleanupPromotionJobs] Found ${childJobs.length} child jobs to delete for promotion ${promotionId}`
        );

        // Delete only child jobs from storage
        let deletedCount = 0;
        for (const childJob of childJobs) {
            try {
                const deleted = await this.jobManager.deleteJob(childJob.id);
                if (deleted) {
                    deletedCount++;
                }
            } catch (error) {
                console.error(`[CleanupPromotionJobs] Failed to delete job ${childJob.id}:`, error);
            }
        }

        console.log(
            `[CleanupPromotionJobs] Deleted ${deletedCount} child jobs for promotion ${promotionId}, preserved parent job ${parentJob.id}`
        );

        return {
            promotionId,
            deletedChildJobs: deletedCount,
            parentJobPreserved: true,
        };
    }
}
