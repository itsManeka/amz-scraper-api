import * as cheerio from 'cheerio';

/**
 * Parser for Amazon promotion pages
 * Extracts promotion details, dates, discounts, and product ASINs
 */
export class AmazonPromotionHtmlParser {
    /**
     * Parses promotion details from HTML
     * @param html - Raw HTML string
     * @returns Object with promotion title and details
     */
    parsePromotionDetails(html: string): { title: string; details: string } {
        const $ = cheerio.load(html);

        const title = $('#promotionTitle h1 span').text().trim() || '';
        const details = $('#promotionSchedule span').text().trim() || '';

        return { title, details };
    }

    /**
     * Extracts discount type and value from description
     * @param description - Promotion description text
     * @returns Object with discount type and value
     */
    parseDiscountInfo(description: string): { type: 'percentage' | 'fixed'; value: number } {
        // Try to match percentage discount (e.g., "20% off", "30%")
        const percentageMatch = description.match(/(\d+(?:[.,]\d+)?)\s*%/);
        if (percentageMatch) {
            return {
                type: 'percentage',
                value: parseFloat(percentageMatch[1].replace(',', '.')),
            };
        }

        // Try to match fixed discount (e.g., "R$ 50", "R$ 50,00")
        const fixedMatch = description.match(/R\$\s*(\d+(?:[.,]\d+)?)/);
        if (fixedMatch) {
            return {
                type: 'fixed',
                value: parseFloat(fixedMatch[1].replace(',', '.')),
            };
        }

        // Default to percentage with 0 if no discount found
        return { type: 'percentage', value: 0 };
    }

    /**
     * Parses dates from promotion details text
     * @param details - Promotion details text with date range
     * @returns Object with start and end dates (or null if parsing fails)
     */
    parseDates(details: string): { startDate: Date | null; endDate: Date | null } {
        if (!details) {
            return { startDate: null, endDate: null };
        }

        try {
            // Pattern: "De sexta-feira 24 de outubro de 2025 às 09:00 BRT até sexta-feira 31 de outubro de 2025"
            // Also supports: "De 24 de outubro de 2025 até 31 de outubro de 2025"
            const datePattern =
                /(?:De\s+)?(?:\w+-feira\s+)?(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})(?:\s+às\s+(\d{2}):(\d{2}))?/gi;
            const matches = Array.from(details.matchAll(datePattern));

            if (matches.length >= 2) {
                const [startMatch, endMatch] = matches;

                const startDate = this.parsePortugueseDate(
                    parseInt(startMatch[1]),
                    startMatch[2],
                    parseInt(startMatch[3]),
                    startMatch[4] ? parseInt(startMatch[4]) : 0,
                    startMatch[5] ? parseInt(startMatch[5]) : 0
                );

                const endDate = this.parsePortugueseDate(
                    parseInt(endMatch[1]),
                    endMatch[2],
                    parseInt(endMatch[3]),
                    endMatch[4] ? parseInt(endMatch[4]) : 23,
                    endMatch[5] ? parseInt(endMatch[5]) : 59
                );

                return { startDate, endDate };
            }
        } catch (error) {
            // If parsing fails, return null dates
        }

        return { startDate: null, endDate: null };
    }

    /**
     * Parses a Portuguese month name to month number
     * @param monthName - Portuguese month name
     * @returns Month number (0-11) or null if invalid
     */
    private parsePortugueseMonth(monthName: string): number | null {
        const months: Record<string, number> = {
            janeiro: 0,
            fevereiro: 1,
            março: 2,
            abril: 3,
            maio: 4,
            junho: 5,
            julho: 6,
            agosto: 7,
            setembro: 8,
            outubro: 9,
            novembro: 10,
            dezembro: 11,
        };

        return months[monthName.toLowerCase()] ?? null;
    }

    /**
     * Creates a Date object from Portuguese date components
     * Considers Brazil timezone (BRT = UTC-3)
     * @param day - Day of month
     * @param monthName - Portuguese month name
     * @param year - Year
     * @param hour - Hour (default 0)
     * @param minute - Minute (default 0)
     * @returns Date object or null if invalid
     */
    private parsePortugueseDate(
        day: number,
        monthName: string,
        year: number,
        hour: number = 0,
        minute: number = 0
    ): Date | null {
        const month = this.parsePortugueseMonth(monthName);
        if (month === null) {
            return null;
        }

        try {
            // Create date string in ISO format with Brazil timezone (BRT = UTC-3)
            // Format: YYYY-MM-DDTHH:mm:ss-03:00
            const monthStr = String(month + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const hourStr = String(hour).padStart(2, '0');
            const minuteStr = String(minute).padStart(2, '0');

            // Create ISO string with Brazil timezone offset (-03:00)
            const isoString = `${year}-${monthStr}-${dayStr}T${hourStr}:${minuteStr}:00-03:00`;
            const date = new Date(isoString);

            // Validate that the date is valid
            if (isNaN(date.getTime())) {
                return null;
            }

            return date;
        } catch (error) {
            return null;
        }
    }

    /**
     * Extracts product ASINs from HTML
     * Uses multiple strategies to find ASINs in different HTML structures
     * @param html - Raw HTML string
     * @returns Array of unique ASINs
     */
    parseInitialAsins(html: string): string[] {
        const $ = cheerio.load(html);
        const asins = new Set<string>();

        // Strategy 1: Find all links with /dp/{ASIN} pattern
        $('a[href*="/dp/"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
                const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/);
                if (asinMatch) {
                    asins.add(asinMatch[1]);
                }
            }
        });

        // Strategy 2: Look for data-asin attributes
        $('[data-asin]').each((_, element) => {
            const asin = $(element).attr('data-asin');
            if (asin && /^[A-Z0-9]{10}$/i.test(asin)) {
                asins.add(asin.toUpperCase());
            }
        });

        // Strategy 3: Look for ASINs in JavaScript/JSON data
        const scriptContent = $('script').text();
        const asinMatches = scriptContent.matchAll(/"asin"\s*:\s*"([A-Z0-9]{10})"/gi);
        for (const match of asinMatches) {
            asins.add(match[1].toUpperCase());
        }

        // Strategy 4: Look for product IDs in various data attributes
        $('[data-product-id], [data-product-asin], [id*="product"]').each((_, element) => {
            const productId =
                $(element).attr('data-product-id') ||
                $(element).attr('data-product-asin') ||
                $(element).attr('id');
            if (productId) {
                const asinMatch = productId.match(/([A-Z0-9]{10})/i);
                if (asinMatch) {
                    asins.add(asinMatch[1].toUpperCase());
                }
            }
        });

        console.log(
            `[AmazonPromotionHtmlParser] Extracted ${asins.size} unique ASINs using multiple strategies`
        );
        return Array.from(asins);
    }

    /**
     * Extracts promotion ID from HTML or URL
     * @param html - Raw HTML string
     * @returns Promotion ID or null if not found
     */
    extractPromotionId(html: string): string | null {
        const $ = cheerio.load(html);

        // Try to extract from meta tags or data attributes
        const metaPromotion = $('meta[name="promotion-id"]').attr('content');
        if (metaPromotion) {
            return metaPromotion;
        }

        // Try to extract from page URL in JavaScript
        const scriptContent = $('script').text();
        const promotionIdMatch = scriptContent.match(/"promotionId"\s*:\s*"([A-Z0-9]+)"/);
        if (promotionIdMatch) {
            return promotionIdMatch[1];
        }

        // Try to extract from canonical URL or links
        const canonicalUrl = $('link[rel="canonical"]').attr('href');
        if (canonicalUrl) {
            const urlMatch = canonicalUrl.match(/\/promotion\/psp\/([A-Z0-9]+)/);
            if (urlMatch) {
                return urlMatch[1];
            }
        }

        return null;
    }
}
