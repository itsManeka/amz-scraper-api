import { Request, Response, NextFunction } from 'express';
import { ProductController } from '../../api/controllers/ProductController';
import { GetProductWithPromoCode } from '../../application/use-cases/GetProductWithPromoCode';
import { StartPromotionScraping } from '../../application/use-cases/StartPromotionScraping';
import { Product } from '../../domain/entities/Product';
import { PromoCode } from '../../domain/entities/PromoCode';
import { Job } from '../../domain/entities/Job';
import { Promotion } from '../../domain/entities/Promotion';

describe('ProductController - Batch Endpoint', () => {
    let controller: ProductController;
    let mockGetProductUseCase: jest.Mocked<GetProductWithPromoCode>;
    let mockStartPromotionScrapingUseCase: jest.Mocked<StartPromotionScraping>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

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

        mockResponse = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };

        mockNext = jest.fn();
    });

    describe('POST /api/products/batch', () => {
        it('should successfully fetch multiple products', async () => {
            const asins = ['B08N5WRWNW', 'B08N5WRWNX'];
            mockRequest = {
                body: { asins },
            };

            const product1 = new Product('B08N5WRWNW', null);
            const product2 = new Product('B08N5WRWNX', null);

            mockGetProductUseCase.execute
                .mockResolvedValueOnce(product1)
                .mockResolvedValueOnce(product2);

            await controller.getProductsBatch(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                products: [
                    {
                        product: { asin: 'B08N5WRWNW', promoCode: null },
                        promotionJob: null,
                        error: null,
                    },
                    {
                        product: { asin: 'B08N5WRWNX', promoCode: null },
                        promotionJob: null,
                        error: null,
                    },
                ],
                total: 2,
                successful: 2,
                failed: 0,
            });
        });

        it('should trigger promotion scraping for products with promo codes', async () => {
            const asins = ['B08N5WRWNW', 'B08N5WRWNX'];
            mockRequest = {
                body: { asins, category: 'Livros' },
            };

            const promoCode = new PromoCode(
                'TESTPROMO',
                'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                'A2P3X1AN29HWHX'
            );
            const product1 = new Product('B08N5WRWNW', promoCode);
            const product2 = new Product('B08N5WRWNX', null);

            const mockJob = new Job<Promotion>({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });

            mockGetProductUseCase.execute
                .mockResolvedValueOnce(product1)
                .mockResolvedValueOnce(product2);

            mockStartPromotionScrapingUseCase.execute.mockResolvedValue(mockJob);

            await controller.getProductsBatch(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockStartPromotionScrapingUseCase.execute).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    products: expect.arrayContaining([
                        expect.objectContaining({
                            promotionJob: {
                                jobId: 'job-123',
                                status: 'pending',
                            },
                        }),
                    ]),
                    total: 2,
                    successful: 2,
                    failed: 0,
                })
            );
        });

        it('should validate asins array is provided', async () => {
            mockRequest = {
                body: {},
            };

            await controller.getProductsBatch(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'ASINs must be an array',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should validate asins array length (empty)', async () => {
            mockRequest = {
                body: { asins: [] },
            };

            await controller.getProductsBatch(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'ASINs array must contain between 1 and 10 items',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should validate asins array length (>10)', async () => {
            mockRequest = {
                body: { asins: Array(11).fill('B08N5WRWNW') },
            };

            await controller.getProductsBatch(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'ASINs array must contain between 1 and 10 items',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should handle individual product errors gracefully', async () => {
            const asins = ['B08N5WRWNW', 'INVALIDASIN'];
            mockRequest = {
                body: { asins },
            };

            const product1 = new Product('B08N5WRWNW', null);

            mockGetProductUseCase.execute
                .mockResolvedValueOnce(product1)
                .mockRejectedValueOnce(new Error('Product not found'));

            await controller.getProductsBatch(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                products: [
                    {
                        product: { asin: 'B08N5WRWNW', promoCode: null },
                        promotionJob: null,
                        error: null,
                    },
                    {
                        product: { asin: 'INVALIDASIN' },
                        promotionJob: null,
                        error: {
                            message: 'Product not found',
                            type: 'Error',
                        },
                    },
                ],
                total: 2,
                successful: 1,
                failed: 1,
            });
        });

        it('should fetch products concurrently', async () => {
            const asins = ['B08N5WRWNW', 'B08N5WRWNX', 'B08N5WRWNY'];
            mockRequest = {
                body: { asins },
            };

            const products = asins.map((asin) => new Product(asin, null));

            mockGetProductUseCase.execute
                .mockResolvedValueOnce(products[0])
                .mockResolvedValueOnce(products[1])
                .mockResolvedValueOnce(products[2]);

            await controller.getProductsBatch(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // All execute calls should have been made
            expect(mockGetProductUseCase.execute).toHaveBeenCalledTimes(3);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    total: 3,
                    successful: 3,
                    failed: 0,
                })
            );
        });

        it('should pass category filters to promotion scraping', async () => {
            const asins = ['B08N5WRWNW'];
            mockRequest = {
                body: {
                    asins,
                    category: 'Livros',
                    subcategory: 'Mangá HQs, Mangás e Graphic Novels',
                },
            };

            const promoCode = new PromoCode(
                'TESTPROMO',
                'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX',
                'A2P3X1AN29HWHX'
            );
            const product = new Product('B08N5WRWNW', promoCode);

            const mockJob = new Job<Promotion>({
                id: 'job-123',
                type: 'promotion-scraping',
                status: 'pending',
                createdAt: new Date(),
            });

            mockGetProductUseCase.execute.mockResolvedValue(product);
            mockStartPromotionScrapingUseCase.execute.mockResolvedValue(mockJob);

            await controller.getProductsBatch(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockStartPromotionScrapingUseCase.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    promotionId: 'A2P3X1AN29HWHX',
                    category: 'Livros',
                    subcategory: 'Mangá HQs, Mangás e Graphic Novels',
                })
            );
        });
    });
});

