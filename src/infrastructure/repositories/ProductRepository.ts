import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Product } from '../../domain/entities/Product';
import { IHttpClient } from '../http/IHttpClient';
import { AmazonHtmlParser } from '../parsers/AmazonHtmlParser';
import { ProductNotFoundError } from '../errors/ScraperError';

/**
 * Implementation of product repository for Amazon Brazil
 * Fetches product pages and extracts information
 */
export class ProductRepository implements IProductRepository {
    private readonly baseUrl = 'https://www.amazon.com.br/dp/';
    private httpClient: IHttpClient;
    private parser: AmazonHtmlParser;

    /**
     * Creates a new ProductRepository instance
     * @param httpClient - HTTP client for making requests
     * @param parser - HTML parser for extracting data
     */
    constructor(httpClient: IHttpClient, parser: AmazonHtmlParser) {
        this.httpClient = httpClient;
        this.parser = parser;
    }

    /**
     * Retrieves product information by ASIN
     * @param asin - The Amazon Standard Identification Number
     * @returns Promise resolving to a Product entity
     * @throws {ProductNotFoundError} If product page is invalid
     * @throws {HttpError} If request fails
     * @throws {ParsingError} If HTML cannot be parsed
     */
    async getProductByAsin(asin: string): Promise<Product> {
        const url = this.buildProductUrl(asin);
        const html = await this.httpClient.get(url);

        // Validate that we received a valid product page
        if (!this.parser.isValidProductPage(html)) {
            throw new ProductNotFoundError(asin);
        }

        // Extract promotional code if present
        const promoCode = this.parser.parsePromoCode(html);

        // Create and return Product entity
        return new Product(asin, promoCode);
    }

    /**
     * Builds the full product URL from an ASIN
     * @param asin - The product ASIN
     * @returns Full product URL
     */
    private buildProductUrl(asin: string): string {
        return `${this.baseUrl}${asin}`;
    }
}
