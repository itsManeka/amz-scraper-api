import { CleanupPromotionJobs } from '../../../application/use-cases/CleanupPromotionJobs';
import { IJobManager } from '../../../infrastructure/jobs/IJobManager';
import { Job } from '../../../domain/entities/Job';

describe('CleanupPromotionJobs', () => {
    let useCase: CleanupPromotionJobs;
    let mockJobManager: jest.Mocked<IJobManager>;

    beforeEach(() => {
        mockJobManager = {
            findJobsByPromotionId: jest.fn(),
            deleteJob: jest.fn(),
            createJob: jest.fn(),
            getJob: jest.fn(),
            findJobByPromotion: jest.fn(),
            listJobs: jest.fn(),
            cancelJob: jest.fn(),
            clearCompletedJobs: jest.fn(),
            getStats: jest.fn(),
            updateJobMetadata: jest.fn(),
            createJobsBatch: jest.fn(),
            retryJob: jest.fn(),
        } as unknown as jest.Mocked<IJobManager>;
        useCase = new CleanupPromotionJobs(mockJobManager);
    });

    it('should delete all child jobs for a promotion', async () => {
        const promotionId = 'PROMO123';
        const parentJobId = 'parent-123';

        const parentJob = new Job({
            id: parentJobId,
            type: 'promotion-orchestrator',
            status: 'completed',
            createdAt: new Date(),
            metadata: { promotionId },
        });

        const completedChildJob = new Job({
            id: 'child-1',
            type: 'promotion-scraping',
            status: 'completed',
            createdAt: new Date(),
            metadata: { parentJobId, promotionId },
        });

        const failedChildJob = new Job({
            id: 'child-2',
            type: 'promotion-scraping',
            status: 'failed',
            createdAt: new Date(),
            metadata: { parentJobId, promotionId },
        });

        const runningChildJob = new Job({
            id: 'child-3',
            type: 'promotion-scraping',
            status: 'running',
            createdAt: new Date(),
            metadata: { parentJobId, promotionId },
        });

        mockJobManager.findJobsByPromotionId.mockResolvedValue([
            parentJob,
            completedChildJob,
            failedChildJob,
            runningChildJob,
        ]);
        mockJobManager.deleteJob.mockResolvedValue(true);

        const result = await useCase.execute(promotionId);

        expect(mockJobManager.findJobsByPromotionId).toHaveBeenCalledWith(promotionId);
        expect(mockJobManager.deleteJob).toHaveBeenCalledTimes(3); // All child jobs
        expect(mockJobManager.deleteJob).toHaveBeenCalledWith(completedChildJob.id);
        expect(mockJobManager.deleteJob).toHaveBeenCalledWith(failedChildJob.id);
        expect(mockJobManager.deleteJob).toHaveBeenCalledWith(runningChildJob.id);
        expect(mockJobManager.deleteJob).not.toHaveBeenCalledWith(parentJob.id); // Parent job should not be deleted
        expect(result).toEqual({
            promotionId,
            deletedChildJobs: 3,
            parentJobPreserved: true,
        });
    });

    it('should delete pending child jobs too', async () => {
        const promotionId = 'PROMO456';
        const parentJobId = 'parent-456';

        const parentJob = new Job({
            id: parentJobId,
            type: 'promotion-orchestrator',
            status: 'running',
            createdAt: new Date(),
            metadata: { promotionId },
        });

        const pendingChildJob = new Job({
            id: 'child-1',
            type: 'promotion-scraping',
            status: 'pending',
            createdAt: new Date(),
            metadata: { parentJobId, promotionId },
        });

        mockJobManager.findJobsByPromotionId.mockResolvedValue([parentJob, pendingChildJob]);
        mockJobManager.deleteJob.mockResolvedValue(true);

        const result = await useCase.execute(promotionId);

        expect(mockJobManager.findJobsByPromotionId).toHaveBeenCalledWith(promotionId);
        expect(mockJobManager.deleteJob).toHaveBeenCalledTimes(1);
        expect(mockJobManager.deleteJob).toHaveBeenCalledWith(pendingChildJob.id);
        expect(result).toEqual({
            promotionId,
            deletedChildJobs: 1,
            parentJobPreserved: true,
        });
    });

    it('should throw error when no parent job found', async () => {
        const promotionId = 'NONEXISTENT';
        mockJobManager.findJobsByPromotionId.mockResolvedValue([]);
        mockJobManager.deleteJob.mockResolvedValue(true);

        await expect(useCase.execute(promotionId)).rejects.toThrow(
            `No parent job found for promotion ${promotionId}`
        );

        expect(mockJobManager.findJobsByPromotionId).toHaveBeenCalledWith(promotionId);
        expect(mockJobManager.deleteJob).not.toHaveBeenCalled();
    });

    it('should handle job deletion failure gracefully', async () => {
        const promotionId = 'PROMO789';
        const parentJobId = 'parent-789';

        const parentJob = new Job({
            id: parentJobId,
            type: 'promotion-orchestrator',
            status: 'completed',
            createdAt: new Date(),
            metadata: { promotionId },
        });

        const completedChildJob = new Job({
            id: 'child-1',
            type: 'promotion-scraping',
            status: 'completed',
            createdAt: new Date(),
            metadata: { parentJobId, promotionId },
        });

        mockJobManager.findJobsByPromotionId.mockResolvedValue([parentJob, completedChildJob]);
        mockJobManager.deleteJob.mockResolvedValue(false); // Simulate deletion failure

        const result = await useCase.execute(promotionId);

        expect(mockJobManager.deleteJob).toHaveBeenCalledWith(completedChildJob.id);
        expect(result).toEqual({
            promotionId,
            deletedChildJobs: 0,
            parentJobPreserved: true,
        }); // No jobs successfully deleted
    });

    it('should only delete child jobs with parentJobId', async () => {
        const promotionId = 'PROMO999';
        const parentJobId = 'parent-999';

        const parentJob = new Job({
            id: parentJobId,
            type: 'promotion-orchestrator',
            status: 'completed',
            createdAt: new Date(),
            metadata: { promotionId }, // No parentJobId
        });

        const childJob1 = new Job({
            id: 'child-1',
            type: 'promotion-scraping',
            status: 'completed',
            createdAt: new Date(),
            metadata: { parentJobId, promotionId }, // Has parentJobId
        });

        const childJob2 = new Job({
            id: 'child-2',
            type: 'promotion-scraping',
            status: 'completed',
            createdAt: new Date(),
            metadata: { parentJobId, promotionId }, // Has parentJobId
        });

        mockJobManager.findJobsByPromotionId.mockResolvedValue([parentJob, childJob1, childJob2]);
        mockJobManager.deleteJob.mockResolvedValue(true);

        const result = await useCase.execute(promotionId);

        expect(mockJobManager.deleteJob).toHaveBeenCalledTimes(2);
        expect(mockJobManager.deleteJob).toHaveBeenCalledWith(childJob1.id);
        expect(mockJobManager.deleteJob).toHaveBeenCalledWith(childJob2.id);
        expect(mockJobManager.deleteJob).not.toHaveBeenCalledWith(parentJob.id);
        expect(result).toEqual({
            promotionId,
            deletedChildJobs: 2,
            parentJobPreserved: true,
        });
    });
});
