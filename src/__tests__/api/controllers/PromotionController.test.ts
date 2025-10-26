import { Request, Response, NextFunction } from 'express';
import { PromotionController } from '../../../api/controllers/PromotionController';
import { StartPromotionScraping } from '../../../application/use-cases/StartPromotionScraping';
import { GetJobStatus } from '../../../application/use-cases/GetJobStatus';
import { GetCachedPromotion } from '../../../application/use-cases/GetCachedPromotion';
import { Job } from '../../../domain/entities/Job';
import { Promotion } from '../../../domain/entities/Promotion';

describe('PromotionController', () => {
    let controller: PromotionController;
    let mockStartPromotionScrapingUseCase: jest.Mocked<StartPromotionScraping>;
    let mockGetJobStatusUseCase: jest.Mocked<GetJobStatus>;
    let mockGetCachedPromotionUseCase: jest.Mocked<GetCachedPromotion>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        mockStartPromotionScrapingUseCase = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<StartPromotionScraping>;

        mockGetJobStatusUseCase = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<GetJobStatus>;

        mockGetCachedPromotionUseCase = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<GetCachedPromotion>;

        controller = new PromotionController(
            mockStartPromotionScrapingUseCase,
            mockGetJobStatusUseCase,
            mockGetCachedPromotionUseCase
        );

        mockRequest = {
            params: {},
            body: {},
            query: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe('startScraping', () => {
        it('should create scraping job successfully', async () => {
            const job = new Job<Promotion>({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });
            mockRequest.body = { promotionId: 'ABC123' };

            mockStartPromotionScrapingUseCase.execute.mockResolvedValue(job);

            await controller.startScraping(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockStartPromotionScrapingUseCase.execute).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(202);
            expect(mockResponse.json).toHaveBeenCalledWith({
                jobId: 'job-123',
                status: 'pending',
                message: 'Promotion scraping job created successfully',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should create scraping job with category and subcategory', async () => {
            const job = new Job<Promotion>({
                id: 'job-456',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });
            mockRequest.body = {
                promotionId: 'XYZ789',
                category: 'Electronics',
                subcategory: 'Computers',
            };

            mockStartPromotionScrapingUseCase.execute.mockResolvedValue(job);

            await controller.startScraping(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockStartPromotionScrapingUseCase.execute).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(202);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call next with error when job creation fails', async () => {
            const error = new Error('Job creation failed');
            mockRequest.body = { promotionId: 'ABC123' };

            mockStartPromotionScrapingUseCase.execute.mockRejectedValue(error);

            await controller.startScraping(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockStartPromotionScrapingUseCase.execute).toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getJobStatus', () => {
        it('should return completed job with result', async () => {
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

            const job = new Job({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'completed',
                createdAt: new Date(),
                completedAt: new Date(),
                result: promotion,
            });

            mockRequest.params = { jobId: 'job-123' };
            mockGetJobStatusUseCase.execute.mockResolvedValue(job);

            await controller.getJobStatus(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('job-123');
            expect(mockResponse.json).toHaveBeenCalledWith({
                jobId: 'job-123',
                status: 'completed',
                result: {
                    promotion,
                },
                completedAt: expect.any(Date),
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return failed job with error', async () => {
            const job = new Job({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'failed',
                createdAt: new Date(),
                startedAt: new Date(),
                completedAt: new Date(),
                error: 'Scraping failed',
            });

            mockRequest.params = { jobId: 'job-123' };
            mockGetJobStatusUseCase.execute.mockResolvedValue(job);

            await controller.getJobStatus(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('job-123');
            expect(mockResponse.json).toHaveBeenCalledWith({
                jobId: 'job-123',
                status: 'failed',
                error: 'Scraping failed',
                completedAt: expect.any(Date),
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return running job with progress', async () => {
            const job = new Job({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'running',
                createdAt: new Date(),
                startedAt: new Date(),
                progress: { productsFound: 50, message: 'Processing' },
            });

            mockRequest.params = { jobId: 'job-123' };
            mockGetJobStatusUseCase.execute.mockResolvedValue(job);

            await controller.getJobStatus(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('job-123');
            expect(mockResponse.json).toHaveBeenCalledWith({
                jobId: 'job-123',
                status: 'running',
                progress: { productsFound: 50, message: 'Processing' },
                startedAt: expect.any(Date),
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return pending job', async () => {
            const job = new Job({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });

            mockRequest.params = { jobId: 'job-123' };
            mockGetJobStatusUseCase.execute.mockResolvedValue(job);

            await controller.getJobStatus(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('job-123');
            expect(mockResponse.json).toHaveBeenCalledWith({
                jobId: 'job-123',
                status: 'pending',
                createdAt: expect.any(Date),
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 404 when job not found', async () => {
            mockRequest.params = { jobId: 'nonexistent' };
            mockGetJobStatusUseCase.execute.mockResolvedValue(null);

            await controller.getJobStatus(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('nonexistent');
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Job not found: nonexistent',
                    type: 'NotFoundError',
                    statusCode: 404,
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call next with error when getJobStatus fails', async () => {
            const error = new Error('Database error');
            mockRequest.params = { jobId: 'job-123' };

            mockGetJobStatusUseCase.execute.mockRejectedValue(error);

            await controller.getJobStatus(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetJobStatusUseCase.execute).toHaveBeenCalledWith('job-123');
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getCachedPromotion', () => {
        it('should return cached promotion', async () => {
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

            mockRequest.params = { promotionId: 'ABC123' };
            mockGetCachedPromotionUseCase.execute.mockResolvedValue(promotion);

            await controller.getCachedPromotion(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetCachedPromotionUseCase.execute).toHaveBeenCalledWith(
                'ABC123',
                undefined,
                undefined
            );
            expect(mockResponse.json).toHaveBeenCalledWith({
                promotion,
                cached: true,
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return cached promotion with category filter', async () => {
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

            mockRequest.params = { promotionId: 'ABC123' };
            mockRequest.query = { category: 'Electronics' };
            mockGetCachedPromotionUseCase.execute.mockResolvedValue(promotion);

            await controller.getCachedPromotion(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetCachedPromotionUseCase.execute).toHaveBeenCalledWith(
                'ABC123',
                'Electronics',
                undefined
            );
            expect(mockResponse.json).toHaveBeenCalledWith({
                promotion,
                cached: true,
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return cached promotion with category and subcategory filter', async () => {
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

            mockRequest.params = { promotionId: 'ABC123' };
            mockRequest.query = { category: 'Electronics', subcategory: 'Computers' };
            mockGetCachedPromotionUseCase.execute.mockResolvedValue(promotion);

            await controller.getCachedPromotion(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetCachedPromotionUseCase.execute).toHaveBeenCalledWith(
                'ABC123',
                'Electronics',
                'Computers'
            );
            expect(mockResponse.json).toHaveBeenCalledWith({
                promotion,
                cached: true,
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 404 when promotion not found in cache', async () => {
            mockRequest.params = { promotionId: 'NOTFOUND' };
            mockGetCachedPromotionUseCase.execute.mockResolvedValue(null);

            await controller.getCachedPromotion(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetCachedPromotionUseCase.execute).toHaveBeenCalledWith(
                'NOTFOUND',
                undefined,
                undefined
            );
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Promotion not found in cache',
                    type: 'NotFoundError',
                    statusCode: 404,
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call next with error when getCachedPromotion fails', async () => {
            const error = new Error('Cache error');
            mockRequest.params = { promotionId: 'ABC123' };

            mockGetCachedPromotionUseCase.execute.mockRejectedValue(error);

            await controller.getCachedPromotion(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockGetCachedPromotionUseCase.execute).toHaveBeenCalledWith(
                'ABC123',
                undefined,
                undefined
            );
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
