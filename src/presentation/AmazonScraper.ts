import { Product } from '../domain/entities/Product';
import { Promotion } from '../domain/entities/Promotion';
import { HttpClient } from '../infrastructure/http/HttpClient';
import { AmazonHtmlParser } from '../infrastructure/parsers/AmazonHtmlParser';
import { ProductRepository } from '../infrastructure/repositories/ProductRepository';
import { BrowserPromotionRepository } from '../infrastructure/repositories/BrowserPromotionRepository';
import { GetProductWithPromoCode } from '../application/use-cases/GetProductWithPromoCode';
import { GetPromotion } from '../application/use-cases/GetPromotion';
import { HttpClientConfig } from '../infrastructure/http/IHttpClient';

/**
 * Configuration options for AmazonScraper
 */
export interface AmazonScraperConfig {
    /**
     * Proxy URL for HTTP requests (optional)
     * Example: "http://proxy.example.com:8080"
     */
    proxy?: string;

    /**
     * Request timeout in milliseconds (default: 30000)
     */
    timeout?: number;

    /**
     * Additional headers to include in requests (optional)
     */
    headers?: Record<string, string>;

    /**
     * Number of retry attempts for failed requests (default: 3)
     * Retries are performed for 5xx errors and network errors
     */
    retries?: number;

    /**
     * Initial delay between retries in milliseconds (default: 1000)
     * Uses exponential backoff with jitter
     */
    retryDelay?: number;
}

/**
 * Main scraper class for Amazon Brazil products and promotions
 * Provides a simple interface for extracting product information and promotional data
 *
 * Note: Promotion scraping uses Puppeteer (headless browser) to handle dynamic content
 *
 * @example
 * ```typescript
 * const scraper = new AmazonScraper({ timeout: 20000 });
 *
 * // Get product information
 * const product = await scraper.getProduct('6589737258');
 * console.log(product.asin, product.promoCode);
 *
 * // Get promotion information (uses headless browser)
 * const promotion = await scraper.getPromotion('A2P3X1AN29HWHX');
 * console.log(promotion.description, promotion.asins);
 * ```
 */
export class AmazonScraper {
    private productUseCase: GetProductWithPromoCode;
    private promotionUseCase: GetPromotion;

    /**
     * Creates a new AmazonScraper instance
     * @param config - Optional configuration for the scraper
     */
    constructor(config: AmazonScraperConfig = {}) {
        // Build HTTP client config
        const httpConfig: HttpClientConfig = {
            timeout: config.timeout,
            proxy: config.proxy,
            headers: config.headers,
            retries: config.retries,
            retryDelay: config.retryDelay,
        };

        // Initialize dependencies following Clean Architecture
        const httpClient = new HttpClient(httpConfig);
        const parser = new AmazonHtmlParser();
        const productRepository = new ProductRepository(httpClient, parser);

        // Use browser-based repository for promotions
        const promotionRepository = new BrowserPromotionRepository(config.timeout || 30000);

        this.productUseCase = new GetProductWithPromoCode(productRepository);
        this.promotionUseCase = new GetPromotion(promotionRepository);
    }

    /**
     * Retrieves product information by ASIN
     * @param asin - The Amazon Standard Identification Number (10 alphanumeric characters)
     * @returns Promise resolving to Product entity with promotional code if available
     * @throws {Error} If ASIN is invalid
     * @throws {ProductNotFoundError} If product is not found
     * @throws {HttpError} If request fails
     * @throws {ParsingError} If HTML parsing fails
     *
     * @example
     * ```typescript
     * const scraper = new AmazonScraper();
     * const product = await scraper.getProduct('6589737258');
     *
     * if (product.hasPromoCode()) {
     *   console.log('Coupon:', product.promoCode.name);
     *   console.log('URL:', product.promoCode.url);
     * }
     * ```
     */
    async getProduct(asin: string): Promise<Product> {
        return await this.productUseCase.execute(asin);
    }

    /**
     * Retrieves promotion information by promotion ID
     * @param promotionId - The Amazon promotion ID (e.g., 'A2P3X1AN29HWHX')
     * @param productCategory - Optional category filter (e.g., 'Livros')
     * @returns Promise resolving to Promotion entity with all products
     * @throws {Error} If promotion ID is invalid
     * @throws {PromotionNotFoundError} If promotion is not found
     * @throws {HttpError} If request fails
     * @throws {ParsingError} If HTML parsing fails
     *
     * @example
     * ```typescript
     * const scraper = new AmazonScraper();
     * const promotion = await scraper.getPromotion('A2P3X1AN29HWHX');
     *
     * console.log('Title:', promotion.description);
     * console.log('Discount:', promotion.discountValue + (promotion.discountType === 'percentage' ? '%' : ' BRL'));
     * console.log('Products:', promotion.asins.length);
     *
     * // With category filter
     * const booksPromotion = await scraper.getPromotion('A2P3X1AN29HWHX', 'Livros');
     * ```
     */
    async getPromotion(promotionId: string, productCategory?: string): Promise<Promotion> {
        return await this.promotionUseCase.execute(promotionId, productCategory);
    }

    /**
     * Retrieves promotion information from a promotion URL
     * Extracts the promotion ID from the URL and fetches the promotion
     * @param url - Full Amazon promotion URL (e.g., 'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX')
     * @param productCategory - Optional category filter (e.g., 'Livros')
     * @returns Promise resolving to Promotion entity with all products
     * @throws {Error} If URL is invalid or promotion ID cannot be extracted
     * @throws {PromotionNotFoundError} If promotion is not found
     * @throws {HttpError} If request fails
     * @throws {ParsingError} If HTML parsing fails
     *
     * @example
     * ```typescript
     * const scraper = new AmazonScraper();
     * const url = 'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX';
     * const promotion = await scraper.getPromotionFromUrl(url);
     *
     * console.log('Promotion:', promotion.description);
     * console.log('Valid from:', promotion.startDate);
     * console.log('Valid until:', promotion.endDate);
     *
     * // With category filter
     * const booksPromotion = await scraper.getPromotionFromUrl(url, 'Livros');
     * ```
     */
    async getPromotionFromUrl(url: string, productCategory?: string): Promise<Promotion> {
        if (!url || typeof url !== 'string') {
            throw new Error('URL must be a non-empty string');
        }

        // Extract promotion ID from URL
        const promotionIdMatch = url.match(/\/promotion\/psp\/([A-Z0-9]+)/);
        if (!promotionIdMatch) {
            throw new Error(
                `Invalid promotion URL: ${url}. Expected format: https://www.amazon.com.br/promotion/psp/{PROMOTION_ID}`
            );
        }

        const promotionId = promotionIdMatch[1];
        return await this.getPromotion(promotionId, productCategory);
    }
}
