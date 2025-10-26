import { Request, Response, NextFunction } from 'express';
import { ValidateRequest } from '../../../api/middlewares/validateRequest';

describe('ValidateRequest', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
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

    describe('asin', () => {
        it('should pass validation for valid ASIN', () => {
            mockRequest.params = { asin: 'B08N5WRWNW' };

            ValidateRequest.asin(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
        });

        it('should fail when ASIN is missing', () => {
            mockRequest.params = {};

            ValidateRequest.asin(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'ASIN parameter is required',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when ASIN is not a string', () => {
            mockRequest.params = { asin: 123 as any };

            ValidateRequest.asin(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should fail when ASIN is not 10 characters', () => {
            mockRequest.params = { asin: 'B08N5' };

            ValidateRequest.asin(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'ASIN must be exactly 10 alphanumeric characters',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when ASIN contains special characters', () => {
            mockRequest.params = { asin: 'B08N5WRWN!' };

            ValidateRequest.asin(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should pass validation for ASIN with lowercase letters', () => {
            mockRequest.params = { asin: 'b08n5wrwnw' };

            ValidateRequest.asin(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('promotionId', () => {
        it('should pass validation for valid promotion ID', () => {
            mockRequest.params = { promotionId: 'ABC123XYZ' };

            ValidateRequest.promotionId(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should fail when promotion ID is missing', () => {
            mockRequest.params = {};

            ValidateRequest.promotionId(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Promotion ID parameter is required',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when promotion ID is not a string', () => {
            mockRequest.params = { promotionId: 123 as any };

            ValidateRequest.promotionId(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should fail when promotion ID is empty after trim', () => {
            mockRequest.params = { promotionId: '   ' };

            ValidateRequest.promotionId(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Promotion ID must contain only alphanumeric characters',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when promotion ID contains special characters', () => {
            mockRequest.params = { promotionId: 'ABC-123' };

            ValidateRequest.promotionId(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });

    describe('jobId', () => {
        it('should pass validation for valid job ID', () => {
            mockRequest.params = { jobId: 'job-123' };

            ValidateRequest.jobId(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should fail when job ID is missing', () => {
            mockRequest.params = {};

            ValidateRequest.jobId(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Job ID parameter is required',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when job ID is not a string', () => {
            mockRequest.params = { jobId: 123 as any };

            ValidateRequest.jobId(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should fail when job ID is empty after trim', () => {
            mockRequest.params = { jobId: '   ' };

            ValidateRequest.jobId(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });

    describe('scrapeRequest', () => {
        it('should pass validation for valid scrape request', () => {
            mockRequest.body = { promotionId: 'ABC123' };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should pass validation with category', () => {
            mockRequest.body = { promotionId: 'ABC123', category: 'Electronics' };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
        });

        it('should pass validation with category and subcategory', () => {
            mockRequest.body = {
                promotionId: 'ABC123',
                category: 'Electronics',
                subcategory: 'Computers',
            };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
        });

        it('should fail when promotionId is missing', () => {
            mockRequest.body = {};

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'promotionId is required and must be a non-empty string',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when promotionId is not a string', () => {
            mockRequest.body = { promotionId: 123 };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should fail when promotionId is empty after trim', () => {
            mockRequest.body = { promotionId: '   ' };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should fail when promotionId contains special characters', () => {
            mockRequest.body = { promotionId: 'ABC-123' };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'promotionId must contain only alphanumeric characters',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when category is empty string', () => {
            mockRequest.body = { promotionId: 'ABC123', category: '' };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'category must be a non-empty string if provided',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when category is not a string', () => {
            mockRequest.body = { promotionId: 'ABC123', category: 123 };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should fail when subcategory is empty string', () => {
            mockRequest.body = {
                promotionId: 'ABC123',
                category: 'Electronics',
                subcategory: '',
            };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'subcategory must be a non-empty string if provided',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when subcategory is not a string', () => {
            mockRequest.body = {
                promotionId: 'ABC123',
                category: 'Electronics',
                subcategory: 123,
            };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        it('should fail when subcategory provided without category', () => {
            mockRequest.body = { promotionId: 'ABC123', subcategory: 'Computers' };

            ValidateRequest.scrapeRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'subcategory cannot be specified without a category',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });
    });

    describe('batchProductRequest', () => {
        it('should pass validation for valid batch request', () => {
            mockRequest.body = { asins: ['B08N5WRWNW', '6589737258'] };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should pass validation with category and subcategory', () => {
            mockRequest.body = {
                asins: ['B08N5WRWNW'],
                category: 'Livros',
                subcategory: 'Mangá',
            };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
        });

        it('should fail when asins is not an array', () => {
            mockRequest.body = { asins: 'B08N5WRWNW' };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'asins must be an array',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when asins array is empty', () => {
            mockRequest.body = { asins: [] };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'asins array must contain between 1 and 10 items',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when asins array has more than 10 items', () => {
            mockRequest.body = {
                asins: [
                    'B08N5WRWNW',
                    'B08N5WRWNX',
                    'B08N5WRWNY',
                    'B08N5WRWNZ',
                    'B08N5WRWN1',
                    'B08N5WRWN2',
                    'B08N5WRWN3',
                    'B08N5WRWN4',
                    'B08N5WRWN5',
                    'B08N5WRWN6',
                    'B08N5WRWN7',
                ],
            };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'asins array must contain between 1 and 10 items',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when ASIN is not a string', () => {
            mockRequest.body = { asins: [123, 'B08N5WRWNW'] };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Each ASIN must be a string',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when ASIN is not 10 characters', () => {
            mockRequest.body = { asins: ['B08N5'] };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: expect.stringContaining(
                            'ASIN must be exactly 10 alphanumeric characters'
                        ),
                        type: 'ValidationError',
                        statusCode: 400,
                    }),
                })
            );
        });

        it('should fail when ASIN contains special characters', () => {
            mockRequest.body = { asins: ['B08N5WRWN!'] };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: expect.stringContaining('Invalid ASIN format'),
                        type: 'ValidationError',
                        statusCode: 400,
                    }),
                })
            );
        });

        it('should pass validation for numeric only ASINs', () => {
            mockRequest.body = { asins: ['6589737258', '8501923281', '8595086354'] };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should fail when category is empty string', () => {
            mockRequest.body = { asins: ['B08N5WRWNW'], category: '' };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'category must be a non-empty string if provided',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });

        it('should fail when subcategory provided without category', () => {
            mockRequest.body = { asins: ['B08N5WRWNW'], subcategory: 'Computers' };

            ValidateRequest.batchProductRequest(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'subcategory cannot be specified without a category',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
        });
    });
});
