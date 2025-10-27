import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../../api/middlewares/authMiddleware';

describe('authMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;
    let originalApiKeys: string | undefined;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        // Save original API_KEYS
        originalApiKeys = process.env.API_KEYS;

        mockRequest = {
            headers: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        // Restore original API_KEYS
        if (originalApiKeys === undefined) {
            delete process.env.API_KEYS;
        } else {
            process.env.API_KEYS = originalApiKeys;
        }
        consoleWarnSpy.mockRestore();
    });

    describe('when API_KEYS is not configured', () => {
        it('should return 401 and log warning', () => {
            delete process.env.API_KEYS;

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Authentication required',
                    type: 'AuthenticationError',
                    statusCode: 401,
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[AuthMiddleware] API_KEYS environment variable not configured'
            );
        });

        it('should return 401 when API_KEYS is empty string', () => {
            process.env.API_KEYS = '';

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Authentication required',
                    type: 'AuthenticationError',
                    statusCode: 401,
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when API_KEYS is only whitespace', () => {
            process.env.API_KEYS = '   ';

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('when API key is not provided', () => {
        beforeEach(() => {
            process.env.API_KEYS = 'test-api-key-123';
        });

        it('should return 401 when X-API-Key header is missing', () => {
            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'API key is required. Please provide X-API-Key header',
                    type: 'AuthenticationError',
                    statusCode: 401,
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when X-API-Key header is not a string', () => {
            mockRequest.headers = {
                'x-api-key': ['not', 'a', 'string'] as unknown as string,
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'API key is required. Please provide X-API-Key header',
                    type: 'AuthenticationError',
                    statusCode: 401,
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('when API key is invalid', () => {
        beforeEach(() => {
            process.env.API_KEYS = 'valid-key-123';
        });

        it('should return 401 for invalid API key', () => {
            mockRequest.headers = {
                'x-api-key': 'invalid-key',
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: {
                    message: 'Invalid API key',
                    type: 'AuthenticationError',
                    statusCode: 401,
                },
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 for empty API key', () => {
            mockRequest.headers = {
                'x-api-key': '',
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('when API key is valid', () => {
        it('should call next() for valid single API key', () => {
            process.env.API_KEYS = 'test-api-key-123';
            mockRequest.headers = {
                'x-api-key': 'test-api-key-123',
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
        });

        it('should call next() when API key matches first key in comma-separated list', () => {
            process.env.API_KEYS = 'key1,key2,key3';
            mockRequest.headers = {
                'x-api-key': 'key1',
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should call next() when API key matches middle key in comma-separated list', () => {
            process.env.API_KEYS = 'key1,key2,key3';
            mockRequest.headers = {
                'x-api-key': 'key2',
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should call next() when API key matches last key in comma-separated list', () => {
            process.env.API_KEYS = 'key1,key2,key3';
            mockRequest.headers = {
                'x-api-key': 'key3',
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should handle API keys with spaces around commas', () => {
            process.env.API_KEYS = 'key1 , key2 , key3';
            mockRequest.headers = {
                'x-api-key': 'key2',
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should handle complex API key format', () => {
            const complexKey = 'sk_live_abcdef1234567890ABCDEF';
            process.env.API_KEYS = complexKey;
            mockRequest.headers = {
                'x-api-key': complexKey,
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should not match partial keys', () => {
            process.env.API_KEYS = 'test-key-123';
            mockRequest.headers = {
                'x-api-key': 'test-key',
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should be case-sensitive', () => {
            process.env.API_KEYS = 'test-api-key';
            mockRequest.headers = {
                'x-api-key': 'TEST-API-KEY',
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle keys with special characters', () => {
            const specialKey = 'key_with-special.chars!@#$%';
            process.env.API_KEYS = specialKey;
            mockRequest.headers = {
                'x-api-key': specialKey,
            };

            authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });
});
