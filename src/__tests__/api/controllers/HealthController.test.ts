import { Request, Response, NextFunction } from 'express';
import { HealthController } from '../../../api/controllers/HealthController';
import { IJobManager } from '../../../infrastructure/jobs/IJobManager';

describe('HealthController', () => {
    let controller: HealthController;
    let mockJobManager: jest.Mocked<IJobManager>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        mockJobManager = {
            getStats: jest.fn(),
        } as unknown as jest.Mocked<IJobManager>;

        controller = new HealthController(mockJobManager);

        mockRequest = {};
        mockResponse = {
            json: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe('getHealth', () => {
        it('should return health status with job stats', async () => {
            const mockStats = {
                running: 2,
                pending: 3,
                completed: 10,
                failed: 1,
                total: 16,
            };

            mockJobManager.getStats.mockResolvedValue(mockStats);

            await controller.getHealth(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockJobManager.getStats).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith({
                status: 'ok',
                uptime: expect.any(Number),
                timestamp: expect.any(String),
                jobs: mockStats,
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call next with error when getStats fails', async () => {
            const error = new Error('Database error');
            mockJobManager.getStats.mockRejectedValue(error);

            await controller.getHealth(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockJobManager.getStats).toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
