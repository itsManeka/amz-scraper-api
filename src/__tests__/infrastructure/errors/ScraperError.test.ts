import {
    ScraperError,
    HttpError,
    ParsingError,
    ProductNotFoundError,
    PromotionNotFoundError,
} from '../../../infrastructure/errors/ScraperError';

describe('ScraperError', () => {
    describe('ScraperError', () => {
        it('should create a ScraperError instance', () => {
            const error = new ScraperError('Test error');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ScraperError);
            expect(error.message).toBe('Test error');
            expect(error.name).toBe('ScraperError');
        });
    });

    describe('HttpError', () => {
        it('should create an HttpError without status code', () => {
            const error = new HttpError('HTTP request failed');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ScraperError);
            expect(error).toBeInstanceOf(HttpError);
            expect(error.message).toBe('HTTP request failed');
            expect(error.name).toBe('HttpError');
            expect(error.statusCode).toBeUndefined();
        });

        it('should create an HttpError with status code', () => {
            const error = new HttpError('Not found', 404);

            expect(error).toBeInstanceOf(HttpError);
            expect(error.message).toBe('Not found');
            expect(error.statusCode).toBe(404);
        });
    });

    describe('ParsingError', () => {
        it('should create a ParsingError instance', () => {
            const error = new ParsingError('Failed to parse HTML');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ScraperError);
            expect(error).toBeInstanceOf(ParsingError);
            expect(error.message).toBe('Failed to parse HTML');
            expect(error.name).toBe('ParsingError');
        });
    });

    describe('ProductNotFoundError', () => {
        it('should create a ProductNotFoundError instance', () => {
            const error = new ProductNotFoundError('6589737258');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ScraperError);
            expect(error).toBeInstanceOf(ProductNotFoundError);
            expect(error.message).toBe('Product with ASIN 6589737258 not found');
            expect(error.name).toBe('ProductNotFoundError');
            expect(error.asin).toBe('6589737258');
        });
    });

    describe('PromotionNotFoundError', () => {
        it('should create a PromotionNotFoundError instance', () => {
            const error = new PromotionNotFoundError('ABC123');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ScraperError);
            expect(error).toBeInstanceOf(PromotionNotFoundError);
            expect(error.message).toBe('Promotion with ID ABC123 not found');
            expect(error.name).toBe('PromotionNotFoundError');
            expect(error.promotionId).toBe('ABC123');
        });
    });
});
