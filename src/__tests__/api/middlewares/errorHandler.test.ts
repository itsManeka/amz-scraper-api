import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../api/middlewares/errorHandler';
import {
    ScraperError,
    HttpError,
    ParsingError,
    ProductNotFoundError,
} from '../../../infrastructure/errors/ScraperError';

describe('errorHandler', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('ProductNotFoundError', () => {
        it('should return 404 with proper error response', () => {
            const error = new ProductNotFoundError('B08N5WRWNW');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Product with ASIN B08N5WRWNW not found',
                    type: 'ProductNotFoundError',
                    statusCode: 404,
                    details: { asin: 'B08N5WRWNW' },
                },
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('[ErrorHandler]', error);
        });
    });

    describe('HttpError', () => {
        it('should return 500 with status code in details', () => {
            const error = new HttpError('Network timeout', 408);

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Network timeout',
                    type: 'HttpError',
                    statusCode: 408,
                    details: { httpStatusCode: 408 },
                },
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('[ErrorHandler]', error);
        });

        it('should return 500 when no status code provided', () => {
            const error = new HttpError('Network error');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Network error',
                    type: 'HttpError',
                    statusCode: 500,
                    details: { httpStatusCode: undefined },
                },
            });
        });
    });

    describe('ParsingError', () => {
        it('should return 500 with proper error response', () => {
            const error = new ParsingError('Failed to parse HTML');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Failed to parse HTML',
                    type: 'ParsingError',
                    statusCode: 500,
                },
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('[ErrorHandler]', error);
        });
    });

    describe('ScraperError', () => {
        it('should return 500 with proper error response', () => {
            const error = new ScraperError('Scraping failed');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Scraping failed',
                    type: 'ScraperError',
                    statusCode: 500,
                },
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('[ErrorHandler]', error);
        });
    });

    describe('ValidationError', () => {
        it('should return 400 with proper error response', () => {
            const error = new Error('Invalid input');
            error.name = 'ValidationError';

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Invalid input',
                    type: 'ValidationError',
                    statusCode: 400,
                },
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('[ErrorHandler]', error);
        });
    });

    describe('Generic Error', () => {
        it('should return 500 for generic error', () => {
            const error = new Error('Something went wrong');

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Something went wrong',
                    type: 'Error',
                    statusCode: 500,
                },
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('[ErrorHandler]', error);
        });

        it('should handle error without message', () => {
            const error = new Error();

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Internal server error',
                    type: 'Error',
                    statusCode: 500,
                },
            });
        });

        it('should handle error without name', () => {
            const error = new Error('Custom error');
            Object.defineProperty(error, 'name', { value: undefined });

            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Custom error',
                    type: 'Error',
                    statusCode: 500,
                },
            });
        });
    });
});
