import { IPromotionRepository } from '../../domain/repositories/IPromotionRepository';
import { Promotion } from '../../domain/entities/Promotion';
import { IHttpClient } from '../http/IHttpClient';
import { AmazonPromotionHtmlParser } from '../parsers/AmazonPromotionHtmlParser';
import { PromotionNotFoundError, ParsingError } from '../errors/ScraperError';

/**
 * Repository for fetching promotion data from Amazon Brazil
 * Uses HTML parsing to extract promotion details and products
 */
export class PromotionRepository implements IPromotionRepository {
    private readonly baseUrl = 'https://www.amazon.com.br';
    private readonly httpClient: IHttpClient;
    private readonly parser: AmazonPromotionHtmlParser;

    constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient;
        this.parser = new AmazonPromotionHtmlParser();
    }

    /**
     * Fetches a promotion by ID
     * @param promotionId - The promotion ID
     * @param productCategory - Optional category filter (e.g., 'Livros')
     * @returns Promise resolving to Promotion entity
     * @throws {PromotionNotFoundError} If promotion not found
     * @throws {ParsingError} If parsing fails
     */
    async getPromotionById(promotionId: string, productCategory?: string): Promise<Promotion> {
        try {
            // 1. Fetch HTML page with optional category filter
            const html = await this.fetchPromotionPage(promotionId, productCategory);

            // 2. Parse promotion details
            const { title, details } = this.parser.parsePromotionDetails(html);
            if (!title) {
                throw new PromotionNotFoundError(promotionId);
            }

            // 3. Parse discount info
            const { type: discountType, value: discountValue } =
                this.parser.parseDiscountInfo(title);

            // 4. Parse dates
            const { startDate, endDate } = this.parser.parseDates(details);

            // 5. Extract all ASINs from HTML
            const asins = this.parser.parseInitialAsins(html);

            // 6. Create and return Promotion entity
            return new Promotion({
                id: promotionId,
                description: title,
                details,
                discountType,
                discountValue,
                startDate,
                endDate,
                asins,
            });
        } catch (error) {
            if (error instanceof PromotionNotFoundError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new ParsingError(
                    `Failed to parse promotion ${promotionId}: ${error.message}`
                );
            }
            throw new ParsingError(`Failed to parse promotion ${promotionId}: Unknown error`);
        }
    }

    /**
     * Fetches the promotion HTML page
     * @param promotionId - The promotion ID
     * @param productCategory - Optional category filter (e.g., 'Livros')
     * @returns Promise resolving to HTML string
     */
    private async fetchPromotionPage(
        promotionId: string,
        productCategory?: string
    ): Promise<string> {
        let url = `${this.baseUrl}/promotion/psp/${promotionId}`;

        // Add category filter if provided
        if (productCategory) {
            url += `?productCategory=${encodeURIComponent(productCategory)}`;
        }

        return await this.httpClient.get(url);
    }
}
