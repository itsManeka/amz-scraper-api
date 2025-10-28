import { GetJobsByPromotionId } from '../../application/use-cases/GetJobsByPromotionId';
import { IJobManager } from '../../infrastructure/jobs/IJobManager';
import { Job } from '../../domain/entities/Job';

describe('GetJobsByPromotionId', () => {
    let useCase: GetJobsByPromotionId;
    let mockJobManager: jest.Mocked<IJobManager>;

    beforeEach(() => {
        mockJobManager = {
            findJobsByPromotionId: jest.fn(),
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
        };

        useCase = new GetJobsByPromotionId(mockJobManager);
    });

    it('should return empty result when no jobs exist', async () => {
        mockJobManager.findJobsByPromotionId.mockResolvedValue([]);

        const result = await useCase.execute('PROMO123');

        expect(result.promotionId).toBe('PROMO123');
        expect(result.jobs).toHaveLength(0);
        expect(result.overallStatus).toBe('failed');
        expect(result.summary.total).toBe(0);
    });

    it('should return pending status when at least one job is pending', async () => {
        const jobs = [
            new Job({
                id: 'job1',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            }),
            new Job({
                id: 'job2',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
            }),
        ];

        mockJobManager.findJobsByPromotionId.mockResolvedValue(jobs);

        const result = await useCase.execute('PROMO123');

        expect(result.overallStatus).toBe('pending');
        expect(result.summary.pending).toBe(1);
        expect(result.summary.completed).toBe(1);
    });

    it('should return running status when at least one job is running', async () => {
        const jobs = [
            new Job({
                id: 'job1',
                type: 'promotion-scraping',
                status: 'running',
                createdAt: new Date(),
            }),
            new Job({
                id: 'job2',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
            }),
        ];

        mockJobManager.findJobsByPromotionId.mockResolvedValue(jobs);

        const result = await useCase.execute('PROMO123');

        expect(result.overallStatus).toBe('running');
        expect(result.summary.running).toBe(1);
        expect(result.summary.completed).toBe(1);
    });

    it('should return completed status when all jobs completed successfully', async () => {
        const jobs = [
            new Job({
                id: 'job1',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
            }),
            new Job({
                id: 'job2',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
            }),
        ];

        mockJobManager.findJobsByPromotionId.mockResolvedValue(jobs);

        const result = await useCase.execute('PROMO123');

        expect(result.overallStatus).toBe('completed');
        expect(result.summary.completed).toBe(2);
        expect(result.summary.total).toBe(2);
    });

    it('should return failed status when all jobs failed', async () => {
        const jobs = [
            new Job({
                id: 'job1',
                type: 'promotion-scraping',
                status: 'failed',
                createdAt: new Date(),
                error: 'Error 1',
            }),
            new Job({
                id: 'job2',
                type: 'promotion-scraping',
                status: 'failed',
                createdAt: new Date(),
                error: 'Error 2',
            }),
        ];

        mockJobManager.findJobsByPromotionId.mockResolvedValue(jobs);

        const result = await useCase.execute('PROMO123');

        expect(result.overallStatus).toBe('failed');
        expect(result.summary.failed).toBe(2);
    });

    it('should return partial status when some jobs succeeded and some failed', async () => {
        const jobs = [
            new Job({
                id: 'job1',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
            }),
            new Job({
                id: 'job2',
                type: 'promotion-scraping',
                status: 'failed',
                createdAt: new Date(),
                error: 'Error',
            }),
            new Job({
                id: 'job3',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
            }),
        ];

        mockJobManager.findJobsByPromotionId.mockResolvedValue(jobs);

        const result = await useCase.execute('PROMO123');

        expect(result.overallStatus).toBe('partial');
        expect(result.summary.completed).toBe(2);
        expect(result.summary.failed).toBe(1);
        expect(result.summary.total).toBe(3);
    });

    it('should include all job details in response', async () => {
        const jobs = [
            new Job({
                id: 'parent-job',
                type: 'promotion-scraping-orchestrator',
                status: 'running',
                createdAt: new Date(),
                metadata: {
                    promotionId: 'PROMO123',
                    category: 'Livros',
                    childJobIds: ['child1', 'child2'],
                },
            }),
            new Job({
                id: 'child1',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
                metadata: {
                    promotionId: 'PROMO123',
                    category: 'Livros',
                    subcategory: 'Romance',
                    parentJobId: 'parent-job',
                },
            }),
        ];

        mockJobManager.findJobsByPromotionId.mockResolvedValue(jobs);

        const result = await useCase.execute('PROMO123');

        expect(result.jobs).toHaveLength(2);
        expect(result.jobs[0].id).toBe('parent-job');
        expect(result.jobs[0].type).toBe('promotion-scraping-orchestrator');
        expect(result.jobs[1].id).toBe('child1');
        expect(result.jobs[1].type).toBe('promotion-scraping');
    });
});
