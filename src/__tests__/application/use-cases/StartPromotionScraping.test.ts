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

            mockJobManager.createJob.mockResolvedValue(job);

            const result = await useCase.execute(request);

            expect(mockJobManager.createJob).toHaveBeenCalledWith(
                'promotion-scraping',
                expect.any(Function)
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

            mockJobManager.createJob.mockResolvedValue(job);

            const result = await useCase.execute(request);

            expect(mockJobManager.createJob).toHaveBeenCalledWith(
                'promotion-scraping',
                expect.any(Function)
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

            mockJobManager.createJob.mockResolvedValue(job);

            const result = await useCase.execute(request);

            expect(mockJobManager.createJob).toHaveBeenCalledWith(
                'promotion-scraping',
                expect.any(Function)
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
});

