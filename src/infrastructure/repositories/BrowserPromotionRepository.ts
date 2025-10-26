import { IPromotionRepository } from '../../domain/repositories/IPromotionRepository';
import { Promotion } from '../../domain/entities/Promotion';
import puppeteer, { Browser, Page } from 'puppeteer';
import { AmazonPromotionHtmlParser } from '../parsers/AmazonPromotionHtmlParser';
import { PromotionNotFoundError, ParsingError } from '../errors/ScraperError';
import { BrowserConfig } from '../browser/BrowserConfig';
import { UserAgentRotator } from '../browser/UserAgentRotator';
import { HeadersRotator } from '../browser/HeadersRotator';

/**
 * Repository for fetching promotion data using a headless browser
 * Uses Puppeteer to execute JavaScript and wait for dynamic content
 * Supports user-agent rotation, category/subcategory filtering, and "Show More" button clicking
 */
export class BrowserPromotionRepository implements IPromotionRepository {
    private readonly baseUrl = 'https://www.amazon.com.br';
    private readonly parser: AmazonPromotionHtmlParser;
    private readonly timeout: number;
    private readonly userAgentRotator: UserAgentRotator;
    private readonly headersRotator: HeadersRotator;

    constructor(timeout: number = 30000) {
        this.parser = new AmazonPromotionHtmlParser();
        this.timeout = timeout;
        this.userAgentRotator = new UserAgentRotator();
        this.headersRotator = new HeadersRotator();
    }

    /**
     * Fetches a promotion by ID using headless browser
     * @param promotionId - The promotion ID
     * @param productCategory - Optional category filter (e.g., 'Livros')
     * @param productSubcategory - Optional subcategory filter (e.g., 'Mangá HQs, Mangás e Graphic Novels')
     * @returns Promise resolving to Promotion entity
     * @throws {PromotionNotFoundError} If promotion not found
     * @throws {ParsingError} If parsing fails
     */
    async getPromotionById(
        promotionId: string,
        productCategory?: string,
        productSubcategory?: string
    ): Promise<Promotion> {
        let browser: Browser | null = null;

        try {
            // Launch browser with optimized configuration
            const launchOptions = BrowserConfig.getLaunchOptions();
            browser = await puppeteer.launch({
                ...launchOptions,
                headless: true, // Use true instead of 'new' for compatibility
            });

            const page = await browser.newPage();

            // Get rotated user agent and viewport
            const userAgent = this.userAgentRotator.getRandom();
            const viewport = this.headersRotator.getRandomViewport();
            const headers = this.headersRotator.getHeaders();

            // Set viewport
            await page.setViewport(viewport);

            // Set user agent
            await page.setUserAgent(userAgent);

            // Set extra headers
            await page.setExtraHTTPHeaders(headers);

            // Override navigator properties to match user agent
            await page.evaluateOnNewDocument((platform: string) => {
                // @ts-expect-error - Overriding navigator in browser context
                Object.defineProperty(navigator, 'platform', {
                    get: () => platform,
                });
            }, this.userAgentRotator.getPlatform(userAgent));

            // Build URL with optional category filter
            let url = `${this.baseUrl}/promotion/psp/${promotionId}`;
            if (productCategory) {
                url += `?productCategory=${encodeURIComponent(productCategory)}`;
            }

            console.log(`[BrowserPromotionRepository] Navigating to: ${url}`);

            // Navigate to promotion page
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: this.timeout,
            });

            // Wait for promotion content to load
            await this.waitForPromotionContent(page);

            // Apply subcategory filter if provided
            if (productSubcategory) {
                await this.applySubcategoryFilter(page, productSubcategory);
            }

            // Click "Show More" button to load all products
            await this.clickShowMoreButton(page);

            // Scroll to load more products if needed (lazy loading)
            await this.scrollToLoadProducts(page);

            // Get final HTML after all JavaScript executed
            const html = await page.content();

            // Close browser before parsing
            await browser.close();
            browser = null;

            // Parse the HTML
            const { title, details } = this.parser.parsePromotionDetails(html);
            if (!title) {
                throw new PromotionNotFoundError(promotionId);
            }

            const { type: discountType, value: discountValue } =
                this.parser.parseDiscountInfo(title);

            const { startDate, endDate } = this.parser.parseDates(details);

            const asins = this.parser.parseInitialAsins(html);

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
            // Ensure browser is closed even if error occurs
            if (browser) {
                await browser.close();
            }

            if (error instanceof PromotionNotFoundError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new ParsingError(
                    `Failed to scrape promotion ${promotionId}: ${error.message}`
                );
            }
            throw new ParsingError(`Failed to scrape promotion ${promotionId}: Unknown error`);
        }
    }

    /**
     * Waits for promotion content to appear on the page
     * @param page - Puppeteer page instance
     */
    private async waitForPromotionContent(page: Page): Promise<void> {
        try {
            // Wait for title or main content container
            await page.waitForSelector('#promotionTitle, .promotion-title, h1', {
                timeout: 10000,
            });

            // Give extra time for products to start loading
            await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
            // If selectors not found, continue anyway - might be different page structure
            console.warn('[BrowserPromotionRepository] Promotion content selectors not found');
        }
    }

    /**
     * Applies subcategory filter on the page
     * @param page - Puppeteer page instance
     * @param subcategory - Subcategory name
     */
    private async applySubcategoryFilter(page: Page, subcategory: string): Promise<void> {
        try {
            console.log(`[BrowserPromotionRepository] Applying subcategory filter: ${subcategory}`);

            // Wait for filters to be available
            await page.waitForSelector('[data-csa-c-element-id*="filter"]', {
                timeout: 5000,
            });

            // Try to find and click the subcategory filter
            const filterClicked = await page.evaluate((subcat: string) => {
                // @ts-expect-error - DOM access in browser context
                const filters = Array.from(document.querySelectorAll('a, span, div'));
                for (const element of filters) {
                    // @ts-expect-error - DOM element in browser context
                    if (element.textContent?.trim() === subcat) {
                        // @ts-expect-error - DOM element in browser context
                        (element as HTMLElement).click();
                        return true;
                    }
                }
                return false;
            }, subcategory);

            if (filterClicked) {
                console.log(
                    '[BrowserPromotionRepository] Subcategory filter clicked, waiting for page update'
                );
                await page.waitForFunction(() => true, { timeout: 2000 }).catch(() => {});
            } else {
                console.warn(
                    `[BrowserPromotionRepository] Subcategory filter not found: ${subcategory}`
                );
            }
        } catch (error) {
            console.warn('[BrowserPromotionRepository] Error applying subcategory filter:', error);
        }
    }

    /**
     * Clicks "Show More" button repeatedly to load all products
     * @param page - Puppeteer page instance
     */
    private async clickShowMoreButton(page: Page): Promise<void> {
        try {
            let clickCount = 0;
            const maxClicks = 20; // Prevent infinite loops
            const waitBetweenClicks = 2000; // 2 seconds between clicks
            const maxWaitForNewProducts = 5000; // Max 5 seconds waiting for new products

            console.log('[BrowserPromotionRepository] Looking for "Show More" button');

            while (clickCount < maxClicks) {
                // Count products before clicking
                const productCountBefore = await page.evaluate(() => {
                    // Count all product items (divs with data-asin attribute)
                    // @ts-expect-error - DOM access in browser context
                    return document.querySelectorAll('[data-asin]:not([data-asin=""])').length;
                });

                // Try to find "Show More" button by text content using page.evaluate
                // Puppeteer doesn't support :has-text() selector (that's Playwright syntax)
                const buttonFound = await page.evaluate(() => {
                    // @ts-expect-error - DOM access in browser context
                    const buttons = Array.from(document.querySelectorAll('button, a'));
                    for (const button of buttons) {
                        // @ts-expect-error - DOM element in browser context
                        const text = button.textContent?.toLowerCase() || '';
                        // @ts-expect-error - Check aria-label too
                        const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';

                        if (
                            text.includes('mostrar mais') ||
                            text.includes('show more') ||
                            text.includes('ver mais') ||
                            ariaLabel.includes('more') ||
                            ariaLabel.includes('mais')
                        ) {
                            // @ts-expect-error - DOM element in browser context
                            (button as HTMLElement).click();
                            return true;
                        }
                    }
                    return false;
                });

                if (!buttonFound) {
                    console.log(
                        `[BrowserPromotionRepository] No more "Show More" button found after ${clickCount} clicks`
                    );
                    break;
                }

                clickCount++;
                console.log(
                    `[BrowserPromotionRepository] Clicked "Show More" button (${clickCount})`
                );

                // Wait for new products to load by checking if product count increased
                try {
                    await page.waitForFunction(
                        (prevCount) => {
                            // @ts-expect-error - DOM access in browser context
                            const currentCount = document.querySelectorAll(
                                '[data-asin]:not([data-asin=""])'
                            ).length;
                            return currentCount > prevCount;
                        },
                        { timeout: maxWaitForNewProducts },
                        productCountBefore
                    );

                    const productCountAfter = await page.evaluate(() => {
                        // @ts-expect-error - DOM access in browser context
                        return document.querySelectorAll('[data-asin]:not([data-asin=""])').length;
                    });

                    console.log(
                        `[BrowserPromotionRepository] Products loaded: ${productCountBefore} -> ${productCountAfter}`
                    );
                } catch (waitError) {
                    console.warn(
                        `[BrowserPromotionRepository] No new products loaded after click ${clickCount}, continuing...`
                    );
                }

                // Additional delay to ensure stability
                await new Promise((resolve) => setTimeout(resolve, waitBetweenClicks));
            }

            if (clickCount >= maxClicks) {
                console.warn('[BrowserPromotionRepository] Reached maximum "Show More" clicks');
            }
        } catch (error) {
            console.warn('[BrowserPromotionRepository] Error clicking "Show More" button:', error);
        }
    }

    /**
     * Scrolls page to trigger lazy loading of products
     * @param page - Puppeteer page instance
     */
    private async scrollToLoadProducts(page: Page): Promise<void> {
        try {
            console.log('[BrowserPromotionRepository] Scrolling to trigger lazy loading');

            // Scroll down multiple times to trigger lazy loading
            for (let i = 0; i < 5; i++) {
                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            // Scroll back to top
            await page.evaluate('window.scrollTo(0, 0)');
            await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
            console.warn('[BrowserPromotionRepository] Error during scrolling:', error);
        }
    }
}
