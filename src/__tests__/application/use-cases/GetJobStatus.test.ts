import { GetJobStatus } from '../../../application/use-cases/GetJobStatus';
import { Job } from '../../../domain/entities/Job';
import { IJobManager } from '../../../infrastructure/jobs/IJobManager';

describe('GetJobStatus Use Case', () => {
    let useCase: GetJobStatus;
    let mockJobManager: jest.Mocked<IJobManager>;

    beforeEach(() => {
        mockJobManager = {
            getJob: jest.fn(),
            createJob: jest.fn(),
            getStats: jest.fn(),
        } as unknown as jest.Mocked<IJobManager>;

        useCase = new GetJobStatus(mockJobManager);
    });

    describe('execute', () => {
        it('should retrieve job by ID', async () => {
            const job = new Job({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });

            mockJobManager.getJob.mockResolvedValue(job);

            const result = await useCase.execute('job-123');

            expect(mockJobManager.getJob).toHaveBeenCalledWith('job-123');
            expect(result).toBe(job);
        });

        it('should return null when job not found', async () => {
            mockJobManager.getJob.mockResolvedValue(null);

            const result = await useCase.execute('nonexistent');

            expect(mockJobManager.getJob).toHaveBeenCalledWith('nonexistent');
            expect(result).toBeNull();
        });

        it('should trim whitespace from jobId', async () => {
            const job = new Job({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });

            mockJobManager.getJob.mockResolvedValue(job);

            await useCase.execute('  job-123  ');

            expect(mockJobManager.getJob).toHaveBeenCalledWith('job-123');
        });

        it('should throw error if jobId is empty', async () => {
            await expect(useCase.execute('')).rejects.toThrow(
                'Job ID is required and must be a non-empty string'
            );
        });

        it('should throw error if jobId is whitespace only', async () => {
            await expect(useCase.execute('   ')).rejects.toThrow(
                'Job ID is required and must be a non-empty string'
            );
        });

        it('should throw error if jobId is not a string', async () => {
            await expect(useCase.execute(123 as any)).rejects.toThrow(
                'Job ID is required and must be a non-empty string'
            );
        });

        it('should handle completed job', async () => {
            const job = new Job({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
                completedAt: new Date(),
                result: { test: 'data' },
            });

            mockJobManager.getJob.mockResolvedValue(job);

            const result = await useCase.execute('job-123');

            expect(result?.isCompleted()).toBe(true);
            expect(result?.result).toEqual({ test: 'data' });
        });

        it('should handle failed job', async () => {
            const job = new Job({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'failed',
                createdAt: new Date(),
                completedAt: new Date(),
                error: 'Something went wrong',
            });

            mockJobManager.getJob.mockResolvedValue(job);

            const result = await useCase.execute('job-123');

            expect(result?.hasFailed()).toBe(true);
            expect(result?.error).toBe('Something went wrong');
        });

        it('should handle running job', async () => {
            const job = new Job({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'running',
                createdAt: new Date(),
                startedAt: new Date(),
                progress: { productsFound: 50 },
            });

            mockJobManager.getJob.mockResolvedValue(job);

            const result = await useCase.execute('job-123');

            expect(result?.isRunning()).toBe(true);
            expect(result?.progress).toEqual({ productsFound: 50 });
        });
    });
});

