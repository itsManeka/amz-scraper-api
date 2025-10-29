import { StartPromotionScraping } from '../../../application/use-cases/StartPromotionScraping';
import { IPromotionRepository } from '../../../domain/repositories/IPromotionRepository';
import { IJobManager } from '../../../infrastructure/jobs/IJobManager';
import { ScrapeRequest } from '../../../domain/entities/ScrapeRequest';
import { Job } from '../../../domain/entities/Job';
import { Promotion } from '../../../domain/entities/Promotion';

describe('StartPromotionScraping Use Case', () => {
    let useCase: StartPromotionScraping;
    let mockPromotionRepository: jest.Mocked<IPromotionRepository>;
    let mockJobManager: jest.Mocked<IJobManager>;

    beforeEach(() => {
        mockPromotionRepository = {
            getPromotionById: jest.fn(),
        } as jest.Mocked<IPromotionRepository>;

        mockJobManager = {
            createJob: jest.fn(),
            getJob: jest.fn(),
            getStats: jest.fn(),
            findJobByPromotion: jest.fn(),
            updateJobMetadata: jest.fn(),
            createJobsBatch: jest.fn(),
            retryJob: jest.fn(),
        } as unknown as jest.Mocked<IJobManager>;

        useCase = new StartPromotionScraping(mockPromotionRepository, mockJobManager);
    });

    describe('execute', () => {
        it('should create a job for promotion scraping', async () => {
            const request = new ScrapeRequest('ABC123');
            const job = new Job<Promotion>({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });

            mockJobManager.findJobByPromotion.mockResolvedValue(null);
            mockJobManager.createJob.mockResolvedValue(job);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith(
                'ABC123',
                undefined,
                undefined
            );
            expect(mockJobManager.createJob).toHaveBeenCalledWith(
                'promotion-scraping',
                expect.any(Function),
                expect.objectContaining({
                    promotionId: 'ABC123',
                })
            );
            expect(result).toBe(job);
        });

        it('should create job with category filter', async () => {
            const request = new ScrapeRequest('ABC123', 'Electronics');
            const parentJob = new Job<Promotion>({
                id: 'job-456',
                type: 'promotion-scraping-orchestrator',
                status: 'pending',
                createdAt: new Date(),
            });

            mockJobManager.findJobByPromotion.mockResolvedValue(null);
            mockJobManager.createJob.mockResolvedValue(parentJob);
            mockJobManager.createJobsBatch.mockResolvedValue([]);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith(
                'ABC123',
                'Electronics',
                undefined
            );
            expect(mockJobManager.createJob).toHaveBeenCalledWith(
                'promotion-scraping-orchestrator',
                expect.any(Function),
                expect.objectContaining({
                    promotionId: 'ABC123',
                    category: 'Electronics',
                    childJobIds: [],
                })
            );
            expect(result).toBe(parentJob);
        });

        it('should create job with category and subcategory filter', async () => {
            const request = new ScrapeRequest('ABC123', 'Electronics', 'Computers');
            const job = new Job<Promotion>({
                id: 'job-789',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });

            mockJobManager.findJobByPromotion.mockResolvedValue(null);
            mockJobManager.createJob.mockResolvedValue(job);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith(
                'ABC123',
                'Electronics',
                'Computers'
            );
            expect(mockJobManager.createJob).toHaveBeenCalledWith(
                'promotion-scraping',
                expect.any(Function),
                expect.objectContaining({
                    promotionId: 'ABC123',
                    category: 'Electronics',
                    subcategory: 'Computers',
                })
            );
            expect(result).toBe(job);
        });

        it('should execute the scraping function when job runs', async () => {
            const request = new ScrapeRequest('ABC123');
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage',
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            });

            let capturedFunction: (() => Promise<Promotion>) | undefined;

            mockJobManager.createJob.mockImplementation(async (_type, fn) => {
                capturedFunction = fn as () => Promise<Promotion>;
                return new Job<Promotion>({
                    id: 'job-123',
                    type: 'promotion-scraping',
                    status: 'pending',
                    createdAt: new Date(),
                });
            });

            mockPromotionRepository.getPromotionById.mockResolvedValue(promotion);

            await useCase.execute(request);

            // Execute the captured function to test it
            expect(capturedFunction).toBeDefined();
            if (capturedFunction) {
                const result = await capturedFunction();
                expect(mockPromotionRepository.getPromotionById).toHaveBeenCalledWith(
                    'ABC123',
                    undefined,
                    undefined,
                    5 // default maxClicks
                );
                expect(result).toBe(promotion);
            }
        });

        it('should call repository with filters when provided', async () => {
            const request = new ScrapeRequest('ABC123', 'Electronics', 'Computers');
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage',
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            });

            let capturedFunction: (() => Promise<Promotion>) | undefined;

            mockJobManager.createJob.mockImplementation(async (_type, fn) => {
                capturedFunction = fn as () => Promise<Promotion>;
                return new Job<Promotion>({
                    id: 'job-123',
                    type: 'promotion-scraping',
                    status: 'pending',
                    createdAt: new Date(),
                });
            });

            mockPromotionRepository.getPromotionById.mockResolvedValue(promotion);

            await useCase.execute(request);

            // Execute the captured function to test it
            if (capturedFunction) {
                await capturedFunction();
                expect(mockPromotionRepository.getPromotionById).toHaveBeenCalledWith(
                    'ABC123',
                    'Electronics',
                    'Computers',
                    5 // default maxClicks
                );
            }
        });
    });

    describe('Duplicate Job Prevention', () => {
        it('should return existing pending job instead of creating new one', async () => {
            const request = new ScrapeRequest('ABC123');
            const existingJob = new Job<Promotion>({
                id: 'existing-job-123',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
                metadata: { promotionId: 'ABC123' },
            });

            mockJobManager.findJobByPromotion.mockResolvedValue(existingJob);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith(
                'ABC123',
                undefined,
                undefined
            );
            expect(mockJobManager.createJob).not.toHaveBeenCalled();
            expect(result).toBe(existingJob);
        });

        it('should return existing running job instead of creating new one', async () => {
            const request = new ScrapeRequest('ABC123', 'Livros');
            const existingJob = new Job<Promotion>({
                id: 'running-job-456',
                type: 'promotion-scraping',
                status: 'running',
                createdAt: new Date(),
                startedAt: new Date(),
                metadata: { promotionId: 'ABC123', category: 'Livros' },
            });

            mockJobManager.findJobByPromotion.mockResolvedValue(existingJob);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith(
                'ABC123',
                'Livros',
                undefined
            );
            expect(mockJobManager.createJob).not.toHaveBeenCalled();
            expect(result).toBe(existingJob);
        });

        it('should return existing completed job instead of creating new one', async () => {
            const request = new ScrapeRequest('ABC123');
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage',
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            });

            const existingJob = new Job<Promotion>({
                id: 'completed-job-789',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
                startedAt: new Date(),
                completedAt: new Date(),
                result: promotion,
                metadata: { promotionId: 'ABC123' },
            });

            mockJobManager.findJobByPromotion.mockResolvedValue(existingJob);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith(
                'ABC123',
                undefined,
                undefined
            );
            expect(mockJobManager.createJob).not.toHaveBeenCalled();
            expect(result).toBe(existingJob);
        });

        it('should create new job if only failed jobs exist', async () => {
            const request = new ScrapeRequest('ABC123');
            const newJob = new Job<Promotion>({
                id: 'new-job-999',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
                metadata: { promotionId: 'ABC123' },
            });

            // findJobByPromotion returns null when only failed jobs exist
            mockJobManager.findJobByPromotion.mockResolvedValue(null);
            mockJobManager.createJob.mockResolvedValue(newJob);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith(
                'ABC123',
                undefined,
                undefined
            );
            expect(mockJobManager.createJob).toHaveBeenCalled();
            expect(result).toBe(newJob);
        });

        it('should differentiate jobs by category filters', async () => {
            const request = new ScrapeRequest('ABC123', 'Livros');

            // No existing job for this category
            mockJobManager.findJobByPromotion.mockResolvedValue(null);

            const newJob = new Job<Promotion>({
                id: 'new-job-with-category',
                type: 'promotion-scraping-orchestrator',
                status: 'pending',
                createdAt: new Date(),
                metadata: { promotionId: 'ABC123', category: 'Livros', childJobIds: [] },
            });

            mockJobManager.createJob.mockResolvedValue(newJob);
            mockJobManager.createJobsBatch.mockResolvedValue([]);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith(
                'ABC123',
                'Livros',
                undefined
            );
            expect(mockJobManager.createJob).toHaveBeenCalledWith(
                'promotion-scraping-orchestrator',
                expect.any(Function),
                expect.objectContaining({
                    promotionId: 'ABC123',
                    category: 'Livros',
                    childJobIds: [],
                })
            );
            expect(result).toBe(newJob);
        });

        it('should differentiate jobs by subcategory filters', async () => {
            const request = new ScrapeRequest(
                'ABC123',
                'Livros',
                'Mangá HQs, Mangás e Graphic Novels'
            );

            // No existing job for this subcategory
            mockJobManager.findJobByPromotion.mockResolvedValue(null);

            const newJob = new Job<Promotion>({
                id: 'new-job-with-subcategory',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
                metadata: {
                    promotionId: 'ABC123',
                    category: 'Livros',
                    subcategory: 'Mangá HQs, Mangás e Graphic Novels',
                },
            });

            mockJobManager.createJob.mockResolvedValue(newJob);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith(
                'ABC123',
                'Livros',
                'Mangá HQs, Mangás e Graphic Novels'
            );
            expect(mockJobManager.createJob).toHaveBeenCalledWith(
                'promotion-scraping',
                expect.any(Function),
                expect.objectContaining({
                    promotionId: 'ABC123',
                    category: 'Livros',
                    subcategory: 'Mangá HQs, Mangás e Graphic Novels',
                })
            );
            expect(result).toBe(newJob);
        });
    });

    describe('resumeParentJob', () => {
        it('should create missing child jobs when parent job is resumed', async () => {
            const parentJobId = 'parent-123';
            const existingChildId = 'child-1';

            // Parent job with 3 subcategories but only 1 child created
            const parentJob = new Job({
                id: parentJobId,
                type: 'promotion-scraping',
                status: 'running',
                createdAt: new Date(),
                metadata: {
                    promotionId: 'PROMO123',
                    category: 'Livros',
                    maxClicks: 5,
                    subcategories: ['SubA', 'SubB', 'SubC'],
                    totalChildrenPlanned: 3,
                    childJobIds: [existingChildId],
                },
            });

            const existingChild = new Job({
                id: existingChildId,
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
                metadata: {
                    promotionId: 'PROMO123',
                    category: 'Livros',
                    subcategory: 'SubA',
                    parentJobId,
                },
            });

            mockJobManager.getJob.mockImplementation((id: string) => {
                if (id === parentJobId) return Promise.resolve(parentJob);
                if (id === existingChildId) return Promise.resolve(existingChild);
                return Promise.resolve(null);
            });

            const newJobs = [
                new Job({
                    id: 'child-2',
                    type: 'promotion-scraping',
                    status: 'pending',
                    createdAt: new Date(),
                    metadata: { subcategory: 'SubB' },
                }),
                new Job({
                    id: 'child-3',
                    type: 'promotion-scraping',
                    status: 'pending',
                    createdAt: new Date(),
                    metadata: { subcategory: 'SubC' },
                }),
            ];

            mockJobManager.createJobsBatch.mockResolvedValue(newJobs);
            mockJobManager.updateJobMetadata.mockResolvedValue(true);

            await useCase.resumeParentJob(parentJobId);

            // Should create 2 missing jobs (SubB and SubC)
            expect(mockJobManager.createJobsBatch).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        metadata: expect.objectContaining({
                            subcategory: 'SubB',
                        }),
                    }),
                    expect.objectContaining({
                        metadata: expect.objectContaining({
                            subcategory: 'SubC',
                        }),
                    }),
                ])
            );

            // Should update parent metadata with all child IDs
            expect(mockJobManager.updateJobMetadata).toHaveBeenCalledWith(
                parentJobId,
                expect.objectContaining({
                    childJobIds: expect.arrayContaining([existingChildId, 'child-2', 'child-3']),
                })
            );
        });

        it('should not create jobs if all child jobs already exist', async () => {
            const parentJobId = 'parent-456';

            const parentJob = new Job({
                id: parentJobId,
                type: 'promotion-scraping',
                status: 'running',
                createdAt: new Date(),
                metadata: {
                    promotionId: 'PROMO456',
                    category: 'Livros',
                    maxClicks: 5,
                    subcategories: ['SubA', 'SubB'],
                    totalChildrenPlanned: 2,
                    childJobIds: ['child-1', 'child-2'],
                },
            });

            const child1 = new Job({
                id: 'child-1',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
                metadata: { subcategory: 'SubA', parentJobId },
            });

            const child2 = new Job({
                id: 'child-2',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
                metadata: { subcategory: 'SubB', parentJobId },
            });

            mockJobManager.getJob.mockImplementation((id: string) => {
                if (id === parentJobId) return Promise.resolve(parentJob);
                if (id === 'child-1') return Promise.resolve(child1);
                if (id === 'child-2') return Promise.resolve(child2);
                return Promise.resolve(null);
            });

            await useCase.resumeParentJob(parentJobId);

            expect(mockJobManager.createJobsBatch).not.toHaveBeenCalled();
            expect(mockJobManager.updateJobMetadata).not.toHaveBeenCalled();
        });

        it('should handle parent job not found', async () => {
            mockJobManager.getJob.mockResolvedValue(null);

            await useCase.resumeParentJob('non-existent');

            expect(mockJobManager.createJobsBatch).not.toHaveBeenCalled();
            expect(mockJobManager.updateJobMetadata).not.toHaveBeenCalled();
        });

        it('should handle parent job without metadata', async () => {
            const parentJob = new Job({
                id: 'parent-789',
                type: 'promotion-scraping',
                status: 'running',
                createdAt: new Date(),
                metadata: null,
            });

            mockJobManager.getJob.mockResolvedValue(parentJob);

            await useCase.resumeParentJob('parent-789');

            expect(mockJobManager.createJobsBatch).not.toHaveBeenCalled();
        });
    });
});
