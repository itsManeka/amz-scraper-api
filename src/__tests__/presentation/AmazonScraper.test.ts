import { AmazonScraper } from '../../presentation/AmazonScraper';
import { Product } from '../../domain/entities/Product';
import { PromoCode } from '../../domain/entities/PromoCode';
import axios from 'axios';
import {
    MOCK_HTML_WITH_COUPON,
    MOCK_HTML_WITHOUT_COUPON,
    MOCK_HTML_INVALID_PAGE,
} from '../helpers/mockHtml';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AmazonScraper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedAxios.create.mockReturnValue(mockedAxios as any);
    });

    describe('constructor', () => {
        it('should create instance with default config', () => {
            const scraper = new AmazonScraper();
            expect(scraper).toBeInstanceOf(AmazonScraper);
        });

        it('should create instance with custom config', () => {
            const scraper = new AmazonScraper({
                timeout: 10000,
                proxy: 'http://proxy.example.com:8080',
                headers: { 'X-Custom': 'value' },
            });
            expect(scraper).toBeInstanceOf(AmazonScraper);
        });
    });

    describe('getProduct', () => {
        it('should return product with promo code', async () => {
            mockedAxios.get.mockResolvedValue({ data: MOCK_HTML_WITH_COUPON });

            const scraper = new AmazonScraper();
            const product = await scraper.getProduct('6589737258');

            expect(product).toBeInstanceOf(Product);
            expect(product.asin).toBe('6589737258');
            expect(product.hasPromoCode()).toBe(true);
            expect(product.promoCode).toBeInstanceOf(PromoCode);
            expect(product.promoCode?.name).toBe('HALLOWEEN20');
            expect(product.promoCode?.promotionId).toBe('A2P3X1AN29HWHX');
        });

        it('should return product without promo code', async () => {
            mockedAxios.get.mockResolvedValue({ data: MOCK_HTML_WITHOUT_COUPON });

            const scraper = new AmazonScraper();
            const product = await scraper.getProduct('1234567890');

            expect(product).toBeInstanceOf(Product);
            expect(product.asin).toBe('1234567890');
            expect(product.hasPromoCode()).toBe(false);
            expect(product.promoCode).toBeNull();
        });

        it('should throw error for invalid product page', async () => {
            mockedAxios.get.mockResolvedValue({ data: MOCK_HTML_INVALID_PAGE });

            const scraper = new AmazonScraper();

            await expect(scraper.getProduct('9999999999')).rejects.toThrow();
        });

        it('should throw error for empty ASIN', async () => {
            const scraper = new AmazonScraper();

            await expect(scraper.getProduct('')).rejects.toThrow('ASIN is required');
        });

        it('should throw error for invalid ASIN format', async () => {
            mockedAxios.get.mockResolvedValue('<html><body></body></html>');
            const scraper = new AmazonScraper();

            // The use case validates ASIN format, which would result in error
            await expect(scraper.getProduct('123')).rejects.toThrow();
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network error');
            mockedAxios.isAxiosError.mockReturnValue(false);
            mockedAxios.get.mockRejectedValue(networkError);

            const scraper = new AmazonScraper();

            await expect(scraper.getProduct('6589737258')).rejects.toThrow();
        });

        it('should use custom timeout from config', async () => {
            mockedAxios.get.mockResolvedValue({ data: MOCK_HTML_WITH_COUPON });

            const scraper = new AmazonScraper({ timeout: 5000 });
            await scraper.getProduct('6589737258');

            expect(mockedAxios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeout: 5000,
                })
            );
        });
    });

    describe('integration scenarios', () => {
        it('should handle product with coupon end-to-end', async () => {
            mockedAxios.get.mockResolvedValue({ data: MOCK_HTML_WITH_COUPON });

            const scraper = new AmazonScraper();
            const product = await scraper.getProduct('6589737258');
            const json = product.toJSON();

            expect(json).toEqual({
                asin: '6589737258',
                promoCode: {
                    name: 'HALLOWEEN20',
                    url: 'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX?ref=psp_external&redirectAsin=6589737258',
                    promotionId: 'A2P3X1AN29HWHX',
                },
            });
        });

        it('should handle product without coupon end-to-end', async () => {
            mockedAxios.get.mockResolvedValue({ data: MOCK_HTML_WITHOUT_COUPON });

            const scraper = new AmazonScraper();
            const product = await scraper.getProduct('1234567890');
            const json = product.toJSON();

            expect(json).toEqual({
                asin: '1234567890',
                promoCode: null,
            });
        });
    });
});
