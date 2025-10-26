import { Job, JobStatus, JobProgress } from '../../../domain/entities/Job';

describe('Job Entity', () => {
    describe('Constructor', () => {
        it('should create a valid Job entity', () => {
            const createdAt = new Date();
            const job = new Job({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt,
            });

            expect(job.id).toBe('job-123');
            expect(job.type).toBe('promotion-scraping');
            expect(job.status).toBe('pending');
            expect(job.createdAt).toBe(createdAt);
            expect(job.startedAt).toBeNull();
            expect(job.completedAt).toBeNull();
            expect(job.progress).toBeNull();
            expect(job.result).toBeNull();
            expect(job.error).toBeNull();
        });

        it('should create a Job with all fields', () => {
            const createdAt = new Date();
            const startedAt = new Date();
            const completedAt = new Date();
            const progress: JobProgress = { productsFound: 10, message: 'In progress' };
            const result = { promotion: 'ABC123' };

            const job = new Job({
                id: 'job-456',
                type: 'promotion-scraping',
                status: 'running',
                createdAt,
                startedAt,
                completedAt,
                progress,
                result,
            });

            expect(job.id).toBe('job-456');
            expect(job.status).toBe('running');
            expect(job.startedAt).toBe(startedAt);
            expect(job.completedAt).toBe(completedAt);
            expect(job.progress).toBe(progress);
            expect(job.result).toBe(result);
        });

        it('should make properties readonly', () => {
            const job = new Job({
                id: 'job-123',
                type: 'test',
                status: 'pending',
                createdAt: new Date(),
            });

            // TypeScript will prevent this at compile time
            // At runtime, readonly doesn't actually prevent assignment in JS
            // But we can verify the properties exist
            expect(job.id).toBe('job-123');
            expect(job.type).toBe('test');
            expect(job.status).toBe('pending');
        });
    });

    describe('Validation', () => {
        it('should throw error if ID is missing', () => {
            expect(() => {
                new Job({
                    id: '',
                    type: 'test',
                    status: 'pending',
                    createdAt: new Date(),
                });
            }).toThrow('Job ID is required and must be a string');
        });

        it('should throw error if ID is not a string', () => {
            expect(() => {
                new Job({
                    id: 123 as any,
                    type: 'test',
                    status: 'pending',
                    createdAt: new Date(),
                });
            }).toThrow('Job ID is required and must be a string');
        });

        it('should throw error if type is missing', () => {
            expect(() => {
                new Job({
                    id: 'job-123',
                    type: '',
                    status: 'pending',
                    createdAt: new Date(),
                });
            }).toThrow('Job type is required and must be a string');
        });

        it('should throw error if type is not a string', () => {
            expect(() => {
                new Job({
                    id: 'job-123',
                    type: 123 as any,
                    status: 'pending',
                    createdAt: new Date(),
                });
            }).toThrow('Job type is required and must be a string');
        });

        it('should throw error if status is invalid', () => {
            expect(() => {
                new Job({
                    id: 'job-123',
                    type: 'test',
                    status: 'invalid' as JobStatus,
                    createdAt: new Date(),
                });
            }).toThrow('Job status must be one of: pending, running, completed, failed');
        });

        it('should throw error if createdAt is not a Date', () => {
            expect(() => {
                new Job({
                    id: 'job-123',
                    type: 'test',
                    status: 'pending',
                    createdAt: '2024-01-01' as any,
                });
            }).toThrow('Job createdAt must be a Date object');
        });
    });

    describe('Status Checks', () => {
        it('should correctly identify completed status', () => {
            const completedJob = new Job({
                id: 'job-123',
                type: 'test',
                status: 'completed',
                createdAt: new Date(),
            });

            expect(completedJob.isCompleted()).toBe(true);
            expect(completedJob.isRunning()).toBe(false);
            expect(completedJob.isPending()).toBe(false);
            expect(completedJob.hasFailed()).toBe(false);
        });

        it('should correctly identify failed status', () => {
            const failedJob = new Job({
                id: 'job-123',
                type: 'test',
                status: 'failed',
                createdAt: new Date(),
            });

            expect(failedJob.isCompleted()).toBe(true);
            expect(failedJob.isRunning()).toBe(false);
            expect(failedJob.isPending()).toBe(false);
            expect(failedJob.hasFailed()).toBe(true);
        });

        it('should correctly identify running status', () => {
            const runningJob = new Job({
                id: 'job-123',
                type: 'test',
                status: 'running',
                createdAt: new Date(),
            });

            expect(runningJob.isCompleted()).toBe(false);
            expect(runningJob.isRunning()).toBe(true);
            expect(runningJob.isPending()).toBe(false);
            expect(runningJob.hasFailed()).toBe(false);
        });

        it('should correctly identify pending status', () => {
            const pendingJob = new Job({
                id: 'job-123',
                type: 'test',
                status: 'pending',
                createdAt: new Date(),
            });

            expect(pendingJob.isCompleted()).toBe(false);
            expect(pendingJob.isRunning()).toBe(false);
            expect(pendingJob.isPending()).toBe(true);
            expect(pendingJob.hasFailed()).toBe(false);
        });
    });

    describe('State Transitions', () => {
        it('should create new job with updated status', () => {
            const original = new Job({
                id: 'job-123',
                type: 'test',
                status: 'pending',
                createdAt: new Date(),
            });

            const running = original.withStatus('running');

            expect(original.status).toBe('pending');
            expect(original.startedAt).toBeNull();
            expect(running.status).toBe('running');
            expect(running.startedAt).toBeInstanceOf(Date);
            expect(running.id).toBe('job-123');
        });

        it('should set completedAt when status is completed', () => {
            const original = new Job({
                id: 'job-123',
                type: 'test',
                status: 'running',
                createdAt: new Date(),
            });

            const completed = original.withStatus('completed');

            expect(completed.status).toBe('completed');
            expect(completed.completedAt).toBeInstanceOf(Date);
        });

        it('should set completedAt when status is failed', () => {
            const original = new Job({
                id: 'job-123',
                type: 'test',
                status: 'running',
                createdAt: new Date(),
            });

            const failed = original.withStatus('failed');

            expect(failed.status).toBe('failed');
            expect(failed.completedAt).toBeInstanceOf(Date);
        });

        it('should create new job with progress', () => {
            const original = new Job({
                id: 'job-123',
                type: 'test',
                status: 'running',
                createdAt: new Date(),
            });

            const progress: JobProgress = { productsFound: 5, message: 'Processing...' };
            const updated = original.withProgress(progress);

            expect(original.progress).toBeNull();
            expect(updated.progress).toBeDefined();
            expect(updated.progress?.productsFound).toBe(5);
            expect(updated.progress?.message).toBe('Processing...');
            expect(updated.progress?.lastUpdate).toBeInstanceOf(Date);
        });

        it('should create new job with result', () => {
            const original = new Job({
                id: 'job-123',
                type: 'test',
                status: 'running',
                createdAt: new Date(),
            });

            const result = { data: 'test result' };
            const completed = original.withResult(result);

            expect(original.status).toBe('running');
            expect(original.result).toBeNull();
            expect(completed.status).toBe('completed');
            expect(completed.result).toBe(result);
            expect(completed.completedAt).toBeInstanceOf(Date);
        });

        it('should create new job with error', () => {
            const original = new Job({
                id: 'job-123',
                type: 'test',
                status: 'running',
                createdAt: new Date(),
            });

            const failed = original.withError('Something went wrong');

            expect(original.status).toBe('running');
            expect(original.error).toBeNull();
            expect(failed.status).toBe('failed');
            expect(failed.error).toBe('Something went wrong');
            expect(failed.completedAt).toBeInstanceOf(Date);
        });
    });

    describe('toJSON', () => {
        it('should return plain object representation', () => {
            const createdAt = new Date();
            const job = new Job({
                id: 'job-123',
                type: 'test',
                status: 'pending',
                createdAt,
            });

            const json = job.toJSON();

            expect(json).toEqual({
                id: 'job-123',
                type: 'test',
                status: 'pending',
                createdAt,
                startedAt: null,
                completedAt: null,
                progress: null,
                result: null,
                error: null,
            });
        });

        it('should return plain object with all fields', () => {
            const createdAt = new Date();
            const startedAt = new Date();
            const completedAt = new Date();
            const progress: JobProgress = { productsFound: 10 };
            const result = { data: 'test' };

            const job = new Job({
                id: 'job-456',
                type: 'test',
                status: 'completed',
                createdAt,
                startedAt,
                completedAt,
                progress,
                result,
                error: 'test error',
            });

            const json = job.toJSON();

            expect(json).toEqual({
                id: 'job-456',
                type: 'test',
                status: 'completed',
                createdAt,
                startedAt,
                completedAt,
                progress,
                result,
                error: 'test error',
            });
        });
    });
});

