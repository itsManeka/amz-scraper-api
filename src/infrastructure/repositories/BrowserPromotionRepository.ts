import { IPromotionRepository } from '../../domain/repositories/IPromotionRepository';
import { Promotion } from '../../domain/entities/Promotion';
import puppeteer, { Browser, Page } from 'puppeteer';
import { AmazonPromotionHtmlParser } from '../parsers/AmazonPromotionHtmlParser';
import { PromotionNotFoundError, ParsingError } from '../errors/ScraperError';
import { BrowserConfig } from '../browser/BrowserConfig';
import { UserAgentRotator } from '../browser/UserAgentRotator';
import { HeadersRotator } from '../browser/HeadersRotator';
import { MemoryMonitor } from '../monitoring/MemoryMonitor';

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
        productSubcategory?: string,
        maxClicks: number = 5
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

            MemoryMonitor.log('Before launching browser');

            // Navigate to promotion page with more resilient options
            await page.goto(url, {
                waitUntil: 'domcontentloaded', // Changed from networkidle2 to be less strict
                timeout: this.timeout,
            });

            // Wait for promotion content to load
            await this.waitForPromotionContent(page);

            // Apply subcategory filter if provided
            if (productSubcategory) {
                await this.applySubcategoryFilter(page, productSubcategory);
            }

            // Click "Show More" button to load all products
            await this.clickShowMoreButton(page, maxClicks);

            // Scroll to load more products if needed (lazy loading)
            await this.scrollToLoadProducts(page);

            // Get final HTML after all JavaScript executed
            const html = await page.content();

            // Close browser before parsing
            await browser.close();
            browser = null;

            MemoryMonitor.log('After closing browser (before GC)');

            // Force garbage collection if available to free Puppeteer memory
            if (global.gc) {
                global.gc();
            }

            MemoryMonitor.log('After GC');

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
     * Extracts available subcategories from the promotion page
     * @param promotionId - The promotion ID
     * @param productCategory - Category filter
     * @returns Promise resolving to array of subcategory names
     */
    async extractSubcategories(promotionId: string, productCategory: string): Promise<string[]> {
        let browser: Browser | null = null;
        let retries = 0;
        const maxRetries = 2;

        while (retries <= maxRetries) {
            try {
                // Launch browser with optimized configuration
                const launchOptions = BrowserConfig.getLaunchOptions();
                browser = await puppeteer.launch({
                    ...launchOptions,
                    headless: true,
                });

                const page = await browser.newPage();

                // Get rotated user agent and viewport
                const userAgent = this.userAgentRotator.getRandom();
                const viewport = this.headersRotator.getRandomViewport();
                const headers = this.headersRotator.getHeaders();

                // Set viewport, user agent, and headers
                await page.setViewport(viewport);
                await page.setUserAgent(userAgent);
                await page.setExtraHTTPHeaders(headers);

                // Override navigator properties
                await page.evaluateOnNewDocument((platform: string) => {
                    // @ts-expect-error - Overriding navigator in browser context
                    Object.defineProperty(navigator, 'platform', {
                        get: () => platform,
                    });
                }, this.userAgentRotator.getPlatform(userAgent));

                // Build URL with category filter
                const url = `${this.baseUrl}/promotion/psp/${promotionId}?productCategory=${encodeURIComponent(productCategory)}`;
                console.log(
                    `[BrowserPromotionRepository] Extracting subcategories from: ${url} (attempt ${retries + 1}/${maxRetries + 1})`
                );

                // Navigate to promotion page with more resilient options
                await page.goto(url, {
                    waitUntil: 'domcontentloaded', // Changed from networkidle2
                    timeout: this.timeout,
                });

                // Wait for content to load
                await this.waitForPromotionContent(page);

                // Extract subcategories from sidebar filters
                // Using specific selectors based on Amazon's promotion page structure
                const subcategories = await page.evaluate(() => {
                    const subcats = new Set<string>();

                    // Strategy 1: Look for subcategories in the department filter sidebar
                    // Subcategories are within #department > [name="subCategoryList"]
                    // @ts-expect-error - DOM access in browser context
                    const subCategoryLists = document.querySelectorAll(
                        '#department [name="subCategoryList"] [data-name="departmentListSubCategoryItemText"]'
                    );

                    for (const element of subCategoryLists) {
                        const text = element.textContent?.trim();
                        const dataValue = element.getAttribute('data-value');

                        // Prefer data-value attribute if available (more reliable)
                        const subcategoryName = dataValue || text;

                        if (
                            subcategoryName &&
                            subcategoryName.length > 0 &&
                            subcategoryName.length < 150
                        ) {
                            subcats.add(subcategoryName);
                        }
                    }

                    // Strategy 2: Fallback - try to extract from JavaScript data if available
                    // The page may have refinement data with subProductCategories
                    try {
                        // @ts-expect-error - Accessing potentially available global variables
                        if (typeof refinement !== 'undefined' && refinement.subProductCategories) {
                            // @ts-expect-error - refinement object
                            const subProductCategories = refinement.subProductCategories;
                            for (const category in subProductCategories) {
                                if (Array.isArray(subProductCategories[category])) {
                                    subProductCategories[category].forEach((subcat: string) => {
                                        if (subcat && subcat.length > 0 && subcat.length < 150) {
                                            subcats.add(subcat);
                                        }
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore errors from accessing undefined variables
                    }

                    // Strategy 3: Generic fallback for filter links in department area
                    if (subcats.size === 0) {
                        // @ts-expect-error - DOM access in browser context
                        const departmentLinks = document.querySelectorAll(
                            '#department a[data-name="departmentListItemText"]'
                        );

                        for (const link of departmentLinks) {
                            const text = link.textContent?.trim();
                            if (text && text.length > 0 && text.length < 150) {
                                subcats.add(text);
                            }
                        }
                    }

                    return Array.from(subcats);
                });

                // Close browser
                await browser.close();
                browser = null;

                MemoryMonitor.log('After closing browser - extractSubcategories (before GC)');

                // Force garbage collection if available to free Puppeteer memory
                // This is critical for memory-constrained environments (Render free tier)
                if (global.gc) {
                    global.gc();
                    console.log('[BrowserPromotionRepository] Garbage collection triggered');
                }

                MemoryMonitor.log('After GC - extractSubcategories');

                // Give GC time to clean up Puppeteer memory before continuing
                // This prevents OOM when creating multiple child jobs immediately after
                await new Promise((resolve) => setTimeout(resolve, 2000));

                // Filter out common non-subcategory texts
                const filtered = subcategories.filter(
                    (subcat) =>
                        // Exclude navigation/action texts
                        !subcat.match(
                            /^(mostrar|ver|filtrar|aplicar|limpar|todos|page|página|qualquer)/i
                        ) &&
                        // Exclude "Ver mais" and similar expansion texts
                        !subcat.match(/ver\s+mais|see\s+more|show\s+more|menos|less/i) &&
                        // Exclude pure numbers (pagination, counts, etc.)
                        !subcat.match(/^\d+$/) &&
                        // Exclude very short texts (likely not real subcategories)
                        subcat.length > 2 &&
                        // Exclude if it's just "Departamento" or the category name itself
                        !subcat.match(/^departamento$/i) &&
                        // Exclude "Qualquer departamento" explicitly
                        !subcat.match(/^qualquer\s+departamento$/i)
                );

                console.log(
                    `[BrowserPromotionRepository] Found ${filtered.length} subcategories: ${filtered.join(', ')}`
                );

                return filtered;
            } catch (error) {
                if (browser) {
                    try {
                        await browser.close();
                    } catch (closeError) {
                        console.error(
                            '[BrowserPromotionRepository] Error closing browser:',
                            closeError
                        );
                    }
                    browser = null;
                }

                retries++;
                const isLastAttempt = retries > maxRetries;

                if (
                    error instanceof Error &&
                    error.message.includes('detached') &&
                    !isLastAttempt
                ) {
                    console.warn(
                        `[BrowserPromotionRepository] Frame detached error (attempt ${retries}/${maxRetries + 1}), retrying...`
                    );
                    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before retry
                    continue;
                }

                console.error(
                    '[BrowserPromotionRepository] Error extracting subcategories:',
                    error
                );
                // Return empty array on error - will proceed with no subcategories
                return [];
            }
        }

        // If we reach here, all retries failed
        console.warn('[BrowserPromotionRepository] All attempts to extract subcategories failed');
        return [];
    }

    /**
     * Applies subcategory filter on the page
     * Retries up to 3 times before failing
     * @param page - Puppeteer page instance
     * @param subcategory - Subcategory name
     * @throws {Error} If filter cannot be applied after all retries
     */
    private async applySubcategoryFilter(page: Page, subcategory: string): Promise<void> {
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(
                    `[BrowserPromotionRepository] Applying subcategory filter (attempt ${attempt}/${maxRetries}): ${subcategory}`
                );

                // Wait for department section to be available (using correct selector)
                await page.waitForSelector('#department', {
                    timeout: 5000,
                });

                // Try to find and click the subcategory filter using the correct selector
                const filterClicked = await page.evaluate((subcat: string) => {
                    // Look for subcategory elements using the exact selector from the page
                    // @ts-expect-error - DOM access in browser context
                    const subcategoryElements = document.querySelectorAll(
                        '[data-name="departmentListSubCategoryItemText"]'
                    );

                    for (const element of subcategoryElements) {
                        const text = element.textContent?.trim();
                        const dataValue = element.getAttribute('data-value');

                        // Match by text content or data-value attribute
                        if (text === subcat || dataValue === subcat) {
                            // @ts-expect-error - HTMLElement not available in evaluate context
                            (element as HTMLElement).click();
                            return true;
                        }
                    }
                    return false;
                }, subcategory);

                if (filterClicked) {
                    console.log(
                        '[BrowserPromotionRepository] Subcategory filter clicked successfully, waiting for page update'
                    );
                    // Wait for the page to update after clicking the subcategory filter
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    return; // Success, exit function
                } else {
                    throw new Error(`Subcategory element not found in DOM: ${subcategory}`);
                }
            } catch (error) {
                lastError = error as Error;
                console.warn(
                    `[BrowserPromotionRepository] Attempt ${attempt}/${maxRetries} failed:`,
                    error
                );

                // If not the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    console.log(
                        `[BrowserPromotionRepository] Waiting 2s before retry ${attempt + 1}...`
                    );
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            }
        }

        // If we get here, all retries failed
        const errorMessage = `Failed to apply subcategory filter "${subcategory}" after ${maxRetries} attempts: ${lastError?.message}`;
        console.error(`[BrowserPromotionRepository] ${errorMessage}`);
        throw new Error(errorMessage);
    }

    /**
     * Clicks "Show More" button repeatedly to load all products
     * @param page - Puppeteer page instance
     */
    private async clickShowMoreButton(page: Page, maxClicks: number): Promise<void> {
        try {
            let clickCount = 0;
            const waitBetweenClicks = 2000; // 2 seconds between clicks
            const maxWaitForNewProducts = 5000; // Max 5 seconds waiting for new products

            console.log('[BrowserPromotionRepository] Looking for "Show More" button');

            while (clickCount < maxClicks) {
                // Count products before clicking using multiple selectors
                const productCountBefore = await page.evaluate(() => {
                    // Try multiple selectors to find products
                    // @ts-expect-error - DOM access in browser context
                    const dataAsinCount = document.querySelectorAll(
                        '[data-asin]:not([data-asin=""])'
                    ).length;
                    // @ts-expect-error - DOM access in browser context
                    const productLinksCount = document.querySelectorAll('a[href*="/dp/"]').length;
                    // @ts-expect-error - DOM access in browser context
                    const productCardsCount = document.querySelectorAll(
                        '[class*="product"], [class*="item"]'
                    ).length;

                    return {
                        dataAsin: dataAsinCount,
                        productLinks: productLinksCount,
                        productCards: productCardsCount,
                        max: Math.max(dataAsinCount, productLinksCount, productCardsCount),
                    };
                });

                console.log(
                    `[BrowserPromotionRepository] Product count before click ${clickCount + 1}: data-asin=${productCountBefore.dataAsin}, links=${productCountBefore.productLinks}, cards=${productCountBefore.productCards}`
                );

                // Scroll to bottom to ensure button is visible and trigger lazy loading
                await page.evaluate(() => {
                    // @ts-expect-error - DOM access in browser context
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Try to find and click "Show More" button
                // Amazon uses a specific ID for the pagination button
                const clickResult = await page.evaluate(() => {
                    // First, try the specific Amazon Show More button by ID
                    // @ts-expect-error - DOM access in browser context
                    const showMoreById = document.querySelector(
                        '#showMore, #showMoreBtnContainer span'
                    );
                    if (showMoreById) {
                        const buttonText = showMoreById.textContent?.trim();
                        showMoreById.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        showMoreById.click();
                        return { found: true, text: buttonText, method: 'byId' };
                    }

                    // Fallback: search for buttons with "show more" text
                    // But exclude filter expanders by checking parent context
                    const buttons = Array.from(
                        // @ts-expect-error - DOM access in browser context
                        document.querySelectorAll('button, a, span[role="button"], span.a-button')
                    );
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
                            // Skip if it's inside a filter section (expander)
                            // @ts-expect-error - DOM element in browser context
                            const isFilterExpander = button.closest(
                                '[id*="filter"], [class*="filter"], [class*="expander-header"]'
                            );
                            if (isFilterExpander) {
                                continue; // Skip filter expanders
                            }

                            // @ts-expect-error - DOM element in browser context
                            const buttonText = button.textContent?.trim();
                            // @ts-expect-error - DOM element in browser context
                            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // @ts-expect-error - DOM element in browser context
                            (button as HTMLElement).click();
                            return { found: true, text: buttonText, method: 'bySearch' };
                        }
                    }
                    return { found: false, text: null, method: null };
                });

                if (!clickResult.found) {
                    console.log(
                        `[BrowserPromotionRepository] No more "Show More" button found after ${clickCount} clicks`
                    );
                    break;
                }

                clickCount++;
                console.log(
                    `[BrowserPromotionRepository] Clicked "Show More" button (${clickCount}): "${clickResult.text}" via ${clickResult.method}`
                );

                // Wait a bit for the click to register and content to start loading
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Wait for new products to load by checking if product count increased
                try {
                    await page.waitForFunction(
                        (prevCounts) => {
                            // @ts-expect-error - DOM access in browser context
                            const dataAsinCount = document.querySelectorAll(
                                '[data-asin]:not([data-asin=""])'
                            ).length;
                            const productLinksCount =
                                // @ts-expect-error - DOM access in browser context
                                document.querySelectorAll('a[href*="/dp/"]').length;
                            // @ts-expect-error - DOM access in browser context
                            const productCardsCount = document.querySelectorAll(
                                '[class*="product"], [class*="item"]'
                            ).length;

                            const currentMax = Math.max(
                                dataAsinCount,
                                productLinksCount,
                                productCardsCount
                            );
                            return currentMax > prevCounts.max;
                        },
                        { timeout: maxWaitForNewProducts },
                        productCountBefore
                    );

                    const productCountAfter = await page.evaluate(() => {
                        // @ts-expect-error - DOM access in browser context
                        const dataAsinCount = document.querySelectorAll(
                            '[data-asin]:not([data-asin=""])'
                        ).length;

                        const productLinksCount =
                            // @ts-expect-error - DOM access in browser context
                            document.querySelectorAll('a[href*="/dp/"]').length;
                        // @ts-expect-error - DOM access in browser context
                        const productCardsCount = document.querySelectorAll(
                            '[class*="product"], [class*="item"]'
                        ).length;

                        return {
                            dataAsin: dataAsinCount,
                            productLinks: productLinksCount,
                            productCards: productCardsCount,
                            max: Math.max(dataAsinCount, productLinksCount, productCardsCount),
                        };
                    });

                    console.log(
                        `[BrowserPromotionRepository] Products loaded: ${productCountBefore.max} -> ${productCountAfter.max} (data-asin: ${productCountBefore.dataAsin}->${productCountAfter.dataAsin}, links: ${productCountBefore.productLinks}->${productCountAfter.productLinks})`
                    );
                    MemoryMonitor.log(`After Show More click ${clickCount}`);
                } catch (waitError) {
                    const productCountAfter = await page.evaluate(() => {
                        // @ts-expect-error - DOM access in browser context
                        const dataAsinCount = document.querySelectorAll(
                            '[data-asin]:not([data-asin=""])'
                        ).length;
                        const productLinksCount =
                            // @ts-expect-error - DOM access in browser context
                            document.querySelectorAll('a[href*="/dp/"]').length;

                        return { dataAsin: dataAsinCount, productLinks: productLinksCount };
                    });

                    console.warn(
                        `[BrowserPromotionRepository] No new products loaded after click ${clickCount} (before: ${productCountBefore.max}, after check: data-asin=${productCountAfter.dataAsin}, links=${productCountAfter.productLinks}), continuing...`
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
                MemoryMonitor.log(`After scroll ${i + 1}/5`);
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
