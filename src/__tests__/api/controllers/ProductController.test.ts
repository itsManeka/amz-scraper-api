import { Request, Response, NextFunction } from 'express';
import { ProductController } from '../../../api/controllers/ProductController';
import { GetProductWithPromoCode } from '../../../application/use-cases/GetProductWithPromoCode';
import { StartPromotionScraping } from '../../../application/use-cases/StartPromotionScraping';
import { Product } from '../../../domain/entities/Product';
import { PromoCode } from '../../../domain/entities/PromoCode';
import { Promotion } from '../../../domain/entities/Promotion';
import { Job } from '../../../domain/entities/Job';

describe('ProductController', () => {
    let controller: ProductController;
    let mockGetProductUseCase: jest.Mocked<GetProductWithPromoCode>;
    let mockStartPromotionScrapingUseCase: jest.Mocked<StartPromotionScraping>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        mockGetProductUseCase = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<GetProductWithPromoCode>;

        mockStartPromotionScrapingUseCase = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<StartPromotionScraping>;

        controller = new ProductController(
            mockGetProductUseCase,
            mockStartPromotionScrapingUseCase
        );

        mockRequest = {
            params: {},
        };
        mockResponse = {
            json: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe('getProduct', () => {
        it('should return product without promo code', async () => {
            const product = new Product('B08N5WRWNW');
            mockRequest.params = { asin: 'B08N5WRWNW' };
            mockRequest.query = {};

            mockGetProductUseCase.execute.mockResolvedValue(product);

            await controller.getProduct(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockGetProductUseCase.execute).toHaveBeenCalledWith('B08N5WRWNW');
            expect(mockResponse.json).toHaveBeenCalledWith({
                product: product.toJSON(),
                promotionJob: null,
            });
            expect(mockStartPromotionScrapingUseCase.execute).not.toHaveBeenCalled();
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return product with promo code and start promotion scraping', async () => {
            const promoCode = new PromoCode(
                'SAVE20',
                'https://www.amazon.com.br/promotion/psp/ABC123XYZ',
                'ABC123XYZ'
            );
            const product = new Product('B08N5WRWNW', promoCode);
            const job = new Job<Promotion>({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });

            mockRequest.params = { asin: 'B08N5WRWNW' };
            mockRequest.query = {};
            mockGetProductUseCase.execute.mockResolvedValue(product);
            mockStartPromotionScrapingUseCase.execute.mockResolvedValue(job);

            await controller.getProduct(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockGetProductUseCase.execute).toHaveBeenCalledWith('B08N5WRWNW');
            expect(mockStartPromotionScrapingUseCase.execute).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith({
                product: product.toJSON(),
                promotionJob: {
                    jobId: 'job-123',
                    status: 'pending',
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return product with promo code but no promotion job if URL does not match pattern', async () => {
            const promoCode = new PromoCode(
                'SAVE20',
                'https://www.amazon.com.br/other-page',
                'ABC123XYZ'
            );
            const product = new Product('B08N5WRWNW', promoCode);

            mockRequest.params = { asin: 'B08N5WRWNW' };
            mockRequest.query = {};
            mockGetProductUseCase.execute.mockResolvedValue(product);

            await controller.getProduct(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockGetProductUseCase.execute).toHaveBeenCalledWith('B08N5WRWNW');
            expect(mockStartPromotionScrapingUseCase.execute).not.toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith({
                product: product.toJSON(),
                promotionJob: null,
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call next with error when getProduct fails', async () => {
            const error = new Error('Network error');
            mockRequest.params = { asin: 'B08N5WRWNW' };
            mockRequest.query = {};

            mockGetProductUseCase.execute.mockRejectedValue(error);

            await controller.getProduct(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockGetProductUseCase.execute).toHaveBeenCalledWith('B08N5WRWNW');
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });

        it('should call next with error when startPromotionScraping fails', async () => {
            const promoCode = new PromoCode(
                'SAVE20',
                'https://www.amazon.com.br/promotion/psp/ABC123XYZ',
                'ABC123XYZ'
            );
            const product = new Product('B08N5WRWNW', promoCode);
            const error = new Error('Job creation failed');

            mockRequest.params = { asin: 'B08N5WRWNW' };
            mockRequest.query = {};
            mockGetProductUseCase.execute.mockResolvedValue(product);
            mockStartPromotionScrapingUseCase.execute.mockRejectedValue(error);

            await controller.getProduct(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockGetProductUseCase.execute).toHaveBeenCalledWith('B08N5WRWNW');
            expect(mockStartPromotionScrapingUseCase.execute).toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
