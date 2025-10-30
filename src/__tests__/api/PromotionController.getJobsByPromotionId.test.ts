import { Request, Response, NextFunction } from 'express';
import { PromotionController } from '../../api/controllers/PromotionController';
import { StartPromotionScraping } from '../../application/use-cases/StartPromotionScraping';
import { GetJobStatus } from '../../application/use-cases/GetJobStatus';
import { GetCachedPromotion } from '../../application/use-cases/GetCachedPromotion';
import { GetJobsByPromotionId } from '../../application/use-cases/GetJobsByPromotionId';
import { CleanupPromotionJobs } from '../../application/use-cases/CleanupPromotionJobs';
import { Job } from '../../domain/entities/Job';

describe('PromotionController.getJobsByPromotionId', () => {
    let controller: PromotionController;
    let mockStartPromotionScrapingUseCase: jest.Mocked<StartPromotionScraping>;
    let mockGetJobStatusUseCase: jest.Mocked<GetJobStatus>;
    let mockGetCachedPromotionUseCase: jest.Mocked<GetCachedPromotion>;
    let mockGetJobsByPromotionIdUseCase: jest.Mocked<GetJobsByPromotionId>;
    let mockCleanupPromotionJobsUseCase: jest.Mocked<CleanupPromotionJobs>;
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        mockStartPromotionScrapingUseCase = {
            execute: jest.fn(),
        } as any;

        mockGetJobStatusUseCase = {
            execute: jest.fn(),
        } as any;

        mockGetCachedPromotionUseCase = {
            execute: jest.fn(),
        } as any;

        mockGetJobsByPromotionIdUseCase = {
            execute: jest.fn(),
        } as any;

        mockCleanupPromotionJobsUseCase = {
            execute: jest.fn(),
        } as any;

        controller = new PromotionController(
            mockStartPromotionScrapingUseCase,
            mockGetJobStatusUseCase,
            mockGetCachedPromotionUseCase,
            mockGetJobsByPromotionIdUseCase,
            mockCleanupPromotionJobsUseCase
        );

        req = {
            params: {},
            query: {},
            body: {},
        };

        res = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };

        next = jest.fn();
    });

    it('should return jobs with overall status', async () => {
        req.params = { promotionId: 'PROMO123' };

        const mockResponse = {
            promotionId: 'PROMO123',
            overallStatus: 'completed' as const,
            summary: {
                total: 2,
                pending: 0,
                running: 0,
                completed: 2,
                failed: 0,
            },
            jobs: [
                new Job({
                    id: 'job1',
                    type: 'promotion-scraping',
                    status: 'completed',
                    createdAt: new Date(),
                    metadata: { promotionId: 'PROMO123', subcategory: 'Romance' },
                }),
                new Job({
                    id: 'job2',
                    type: 'promotion-scraping',
                    status: 'completed',
                    createdAt: new Date(),
                    metadata: { promotionId: 'PROMO123', subcategory: 'Fiction' },
                }),
            ],
        };

        mockGetJobsByPromotionIdUseCase.execute.mockResolvedValue(mockResponse);

        await controller.getJobsByPromotionId(req as Request, res as Response, next);

        expect(mockGetJobsByPromotionIdUseCase.execute).toHaveBeenCalledWith('PROMO123');
        expect(res.json).toHaveBeenCalledWith({
            promotionId: 'PROMO123',
            overallStatus: 'completed',
            summary: mockResponse.summary,
            jobs: expect.arrayContaining([
                expect.objectContaining({
                    jobId: 'job1',
                    type: 'promotion-scraping',
                    status: 'completed',
                    subcategory: 'Romance',
                }),
                expect.objectContaining({
                    jobId: 'job2',
                    type: 'promotion-scraping',
                    status: 'completed',
                    subcategory: 'Fiction',
                }),
            ]),
        });
    });

    it('should return 404 when no jobs found', async () => {
        req.params = { promotionId: 'PROMO123' };

        mockGetJobsByPromotionIdUseCase.execute.mockResolvedValue({
            promotionId: 'PROMO123',
            overallStatus: 'failed' as const,
            summary: {
                total: 0,
                pending: 0,
                running: 0,
                completed: 0,
                failed: 0,
            },
            jobs: [],
        });

        await controller.getJobsByPromotionId(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                message: 'No jobs found for promotion: PROMO123',
                type: 'NotFoundError',
                statusCode: 404,
            },
        });
    });

    it('should include parent and child job relationships', async () => {
        req.params = { promotionId: 'PROMO123' };

        const mockResponse = {
            promotionId: 'PROMO123',
            overallStatus: 'partial' as const,
            summary: {
                total: 3,
                pending: 0,
                running: 0,
                completed: 2,
                failed: 1,
            },
            jobs: [
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
                        subcategory: 'Romance',
                        parentJobId: 'parent-job',
                    },
                }),
                new Job({
                    id: 'child2',
                    type: 'promotion-scraping',
                    status: 'failed',
                    createdAt: new Date(),
                    error: 'Timeout',
                    metadata: {
                        promotionId: 'PROMO123',
                        subcategory: 'Fiction',
                        parentJobId: 'parent-job',
                    },
                }),
            ],
        };

        mockGetJobsByPromotionIdUseCase.execute.mockResolvedValue(mockResponse);

        await controller.getJobsByPromotionId(req as Request, res as Response, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                overallStatus: 'partial',
                jobs: expect.arrayContaining([
                    expect.objectContaining({
                        jobId: 'parent-job',
                        type: 'promotion-scraping-orchestrator',
                        childJobIds: ['child1', 'child2'],
                    }),
                    expect.objectContaining({
                        jobId: 'child1',
                        parentJobId: 'parent-job',
                    }),
                    expect.objectContaining({
                        jobId: 'child2',
                        parentJobId: 'parent-job',
                        error: 'Timeout',
                    }),
                ]),
            })
        );
    });

    it('should call next with error on exception', async () => {
        req.params = { promotionId: 'PROMO123' };

        const error = new Error('Database error');
        mockGetJobsByPromotionIdUseCase.execute.mockRejectedValue(error);

        await controller.getJobsByPromotionId(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
