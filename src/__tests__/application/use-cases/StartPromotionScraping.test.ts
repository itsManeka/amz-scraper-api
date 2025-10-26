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

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith('ABC123', undefined, undefined);
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
            const job = new Job<Promotion>({
                id: 'job-456',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });

            mockJobManager.findJobByPromotion.mockResolvedValue(null);
            mockJobManager.createJob.mockResolvedValue(job);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith('ABC123', 'Electronics', undefined);
            expect(mockJobManager.createJob).toHaveBeenCalledWith(
                'promotion-scraping',
                expect.any(Function),
                expect.objectContaining({
                    promotionId: 'ABC123',
                    category: 'Electronics',
                })
            );
            expect(result).toBe(job);
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

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith('ABC123', 'Electronics', 'Computers');
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
                    undefined
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
                    'Computers'
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

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith('ABC123', undefined, undefined);
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

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith('ABC123', 'Livros', undefined);
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

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith('ABC123', undefined, undefined);
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

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith('ABC123', undefined, undefined);
            expect(mockJobManager.createJob).toHaveBeenCalled();
            expect(result).toBe(newJob);
        });

        it('should differentiate jobs by category filters', async () => {
            const request = new ScrapeRequest('ABC123', 'Livros');

            // No existing job for this category
            mockJobManager.findJobByPromotion.mockResolvedValue(null);

            const newJob = new Job<Promotion>({
                id: 'new-job-with-category',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
                metadata: { promotionId: 'ABC123', category: 'Livros' },
            });

            mockJobManager.createJob.mockResolvedValue(newJob);

            const result = await useCase.execute(request);

            expect(mockJobManager.findJobByPromotion).toHaveBeenCalledWith('ABC123', 'Livros', undefined);
            expect(mockJobManager.createJob).toHaveBeenCalledWith(
                'promotion-scraping',
                expect.any(Function),
                expect.objectContaining({
                    promotionId: 'ABC123',
                    category: 'Livros',
                })
            );
            expect(result).toBe(newJob);
        });

        it('should differentiate jobs by subcategory filters', async () => {
            const request = new ScrapeRequest('ABC123', 'Livros', 'Mangá HQs, Mangás e Graphic Novels');

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
});
