import { ProductRepository } from '../../../infrastructure/repositories/ProductRepository';
import { IHttpClient } from '../../../infrastructure/http/IHttpClient';
import { AmazonHtmlParser } from '../../../infrastructure/parsers/AmazonHtmlParser';
import { ProductNotFoundError } from '../../../infrastructure/errors/ScraperError';
import {
    MOCK_HTML_WITH_COUPON,
    MOCK_HTML_WITHOUT_COUPON,
    MOCK_HTML_INVALID_PAGE,
} from '../../helpers/mockHtml';

describe('ProductRepository', () => {
    let repository: ProductRepository;
    let mockHttpClient: jest.Mocked<IHttpClient>;
    let parser: AmazonHtmlParser;

    beforeEach(() => {
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
        } as jest.Mocked<IHttpClient>;
        parser = new AmazonHtmlParser();
        repository = new ProductRepository(mockHttpClient, parser);
    });

    describe('getProductByAsin', () => {
        it('should return product with promo code when available', async () => {
            mockHttpClient.get.mockResolvedValue(MOCK_HTML_WITH_COUPON);

            const product = await repository.getProductByAsin('6589737258');

            expect(product.asin).toBe('6589737258');
            expect(product.hasPromoCode()).toBe(true);
            expect(product.promoCode?.name).toBe('HALLOWEEN20');
            expect(mockHttpClient.get).toHaveBeenCalledWith(
                'https://www.amazon.com.br/dp/6589737258'
            );
        });

        it('should return product without promo code when not available', async () => {
            mockHttpClient.get.mockResolvedValue(MOCK_HTML_WITHOUT_COUPON);

            const product = await repository.getProductByAsin('1234567890');

            expect(product.asin).toBe('1234567890');
            expect(product.hasPromoCode()).toBe(false);
            expect(product.promoCode).toBeNull();
        });

        it('should throw ProductNotFoundError for invalid page', async () => {
            mockHttpClient.get.mockResolvedValue(MOCK_HTML_INVALID_PAGE);

            await expect(repository.getProductByAsin('9999999999')).rejects.toThrow(
                ProductNotFoundError
            );
            await expect(repository.getProductByAsin('9999999999')).rejects.toThrow(
                'Product with ASIN 9999999999 not found'
            );
        });

        it('should propagate HTTP errors', async () => {
            const error = new Error('Network error');
            mockHttpClient.get.mockRejectedValue(error);

            await expect(repository.getProductByAsin('6589737258')).rejects.toThrow(error);
        });

        it('should build correct URL with ASIN', async () => {
            mockHttpClient.get.mockResolvedValue(MOCK_HTML_WITH_COUPON);

            await repository.getProductByAsin('TEST123456');

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                'https://www.amazon.com.br/dp/TEST123456'
            );
        });
    });
});
