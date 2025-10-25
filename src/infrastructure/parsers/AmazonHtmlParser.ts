import * as cheerio from 'cheerio';
import { PromoCode } from '../../domain/entities/PromoCode';
import { ParsingError } from '../errors/ScraperError';

/**
 * Interface for parsed coupon data from HTML
 */
interface ParsedCouponData {
    code: string;
    url: string;
    promotionId: string;
}

/**
 * Parser for Amazon Brazil HTML pages
 * Extracts product information and promotional codes
 */
export class AmazonHtmlParser {
    /**
     * Parses HTML to extract promotional code information
     * @param html - The HTML content to parse
     * @returns PromoCode instance if found, null otherwise
     * @throws {ParsingError} If HTML is invalid or malformed
     */
    parsePromoCode(html: string): PromoCode | null {
        if (!html || html.trim().length === 0) {
            throw new ParsingError('HTML content cannot be empty');
        }

        try {
            const $ = cheerio.load(html);
            const couponData = this.extractCouponData($);

            if (!couponData) {
                return null;
            }

            return new PromoCode(couponData.code, couponData.url, couponData.promotionId);
        } catch (error) {
            if (error instanceof ParsingError) {
                throw error;
            }
            throw new ParsingError(`Failed to parse HTML: ${error}`);
        }
    }

    /**
     * Extracts coupon data from the loaded Cheerio instance
     * @param $ - Cheerio instance with loaded HTML
     * @returns Parsed coupon data or null if not found
     */
    private extractCouponData($: cheerio.CheerioAPI): ParsedCouponData | null {
        // Look for promotional message elements
        // Pattern: <span id="promoMessageCXCW...">  : HALLOWEEN20  <a class="cxcwEmphasisLink" href="...">
        const promoMessageSpans = $('span[id^="promoMessageCXCW"]');

        if (promoMessageSpans.length === 0) {
            return null;
        }

        // Try to extract coupon code and URL from the first matching element
        for (let i = 0; i < promoMessageSpans.length; i++) {
            const element = promoMessageSpans.eq(i);
            const text = element.text();
            const link = element.find('a.cxcwEmphasisLink');

            // Extract coupon code using regex pattern ": COUPONCODE"
            const codeMatch = text.match(/:\s*([A-Z0-9]+)\s*/);
            if (!codeMatch || !link.length) {
                continue;
            }

            const code = codeMatch[1].trim();
            const url = link.attr('href');

            if (!url) {
                continue;
            }

            // Extract promotion ID from URL
            // Pattern: /promotion/psp/{PROMOTION_ID}
            const promotionIdMatch = url.match(/\/promotion\/psp\/([^?&/]+)/);
            if (!promotionIdMatch) {
                continue;
            }

            const promotionId = promotionIdMatch[1];

            // Construct full URL if it's relative
            const fullUrl = this.normalizeUrl(url);

            return {
                code,
                url: fullUrl,
                promotionId,
            };
        }

        return null;
    }

    /**
     * Normalizes URL to ensure it's absolute
     * @param url - The URL to normalize
     * @returns Absolute URL
     */
    private normalizeUrl(url: string): string {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // Amazon Brazil base URL
        const baseUrl = 'https://www.amazon.com.br';

        if (url.startsWith('/')) {
            return baseUrl + url;
        }

        return baseUrl + '/' + url;
    }

    /**
     * Validates if the HTML appears to be a valid Amazon product page
     * @param html - The HTML content to validate
     * @returns true if it appears to be a valid product page
     */
    isValidProductPage(html: string): boolean {
        if (!html || html.trim().length === 0) {
            return false;
        }

        const $ = cheerio.load(html);

        // Check for common Amazon product page elements
        const hasProductTitle = $('#productTitle').length > 0;
        const hasBuyBox = $('#buybox').length > 0 || $('[data-feature-name="buybox"]').length > 0;
        const hasAsinElement = $('[data-asin]').length > 0;

        return hasProductTitle || hasBuyBox || hasAsinElement;
    }
}
