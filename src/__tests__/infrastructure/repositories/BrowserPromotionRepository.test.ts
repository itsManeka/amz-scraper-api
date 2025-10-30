import { BrowserPromotionRepository } from '../../../infrastructure/repositories/BrowserPromotionRepository';
import { PromotionNotFoundError, ParsingError } from '../../../infrastructure/errors/ScraperError';
import puppeteer from 'puppeteer';

// Mock puppeteer
jest.mock('puppeteer');
const mockedPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>;

describe('BrowserPromotionRepository', () => {
    let repository: BrowserPromotionRepository;
    let mockBrowser: any;
    let mockPage: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock page
        mockPage = {
            setViewport: jest.fn().mockResolvedValue(undefined),
            setUserAgent: jest.fn().mockResolvedValue(undefined),
            setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
            evaluateOnNewDocument: jest.fn().mockResolvedValue(undefined),
            goto: jest.fn().mockResolvedValue(undefined),
            waitForSelector: jest.fn().mockResolvedValue(undefined),
            waitForFunction: jest.fn().mockResolvedValue(undefined),
            evaluate: jest.fn(),
            content: jest.fn(),
        };

        // Mock browser
        mockBrowser = {
            newPage: jest.fn().mockResolvedValue(mockPage),
            close: jest.fn().mockResolvedValue(undefined),
        };

        mockedPuppeteer.launch.mockResolvedValue(mockBrowser);

        repository = new BrowserPromotionRepository(30000);

        // Spy on console methods
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should create repository with default timeout', () => {
            const repo = new BrowserPromotionRepository();
            expect(repo).toBeInstanceOf(BrowserPromotionRepository);
        });

        it('should create repository with custom timeout', () => {
            const repo = new BrowserPromotionRepository(60000);
            expect(repo).toBeInstanceOf(BrowserPromotionRepository);
        });
    });

    describe('getPromotionById', () => {
        it('should fetch promotion successfully', async () => {
            const mockHtml = `
                <html>
                    <head><title>Test Promotion</title></head>
                    <body>
                        <div id="promotionTitle"><h1><span>Até 20% de desconto em Livros</span></h1></div>
                        <div id="promotionSchedule"><span>Válido de 01/01/2024 até 31/12/2024</span></div>
                        <a href="/dp/B08N5WRWNW">Product 1</a>
                        <a href="/dp/B08N5WRWN1">Product 2</a>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.evaluate.mockResolvedValue(false); // No "Show More" button
            mockPage.waitForFunction.mockResolvedValue({} as any);

            const promotion = await repository.getPromotionById('ABC123');

            expect(promotion.id).toBe('ABC123');
            expect(promotion.description).toContain('20%');
            expect(mockBrowser.close).toHaveBeenCalled();
        }, 10000);

        it('should fetch promotion with category filter', async () => {
            const mockHtml = `
                <html>
                    <head><title>Test Promotion</title></head>
                    <body>
                        <div id="promotionTitle"><h1><span>15% off Books</span></h1></div>
                        <a href="/dp/B08N5WRWNW">Product 1</a>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.evaluate.mockResolvedValue(false);
            mockPage.waitForFunction.mockResolvedValue({} as any);

            await repository.getPromotionById('ABC123', 'Livros');

            expect(mockPage.goto).toHaveBeenCalledWith(
                expect.stringContaining('productCategory=Livros'),
                expect.any(Object)
            );
        }, 10000);

        it('should apply subcategory filter when provided', async () => {
            jest.useFakeTimers();

            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>Test Promotion</span></h1></div>
                        <div id="department"></div>
                        <a href="/dp/B08N5WRWNW">Product 1</a>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.waitForFunction.mockResolvedValue({} as any);
            mockPage.evaluate
                .mockResolvedValueOnce(true) // Subcategory filter found and clicked
                // clickShowMoreButton evaluate calls
                .mockResolvedValueOnce({
                    dataAsin: 10,
                    productLinks: 20,
                    productCards: 15,
                    max: 20,
                }) // Count before first click
                .mockResolvedValueOnce(undefined) // Scroll
                .mockResolvedValueOnce({ found: false }) // No "Show More" button
                // scrollToLoadProducts evaluate calls
                .mockResolvedValue('window.scrollTo(0, 0)'); // Scroll calls

            const promise = repository.getPromotionById('ABC123', 'Livros', 'Mangá');

            // Fast-forward through subcategory filter setTimeout
            await jest.advanceTimersByTimeAsync(2000);
            // Fast-forward through clickShowMoreButton setTimeout calls
            await jest.advanceTimersByTimeAsync(2000);
            // Fast-forward through scrollToLoadProducts setTimeouts
            for (let i = 0; i < 6; i++) {
                await jest.advanceTimersByTimeAsync(1000);
            }

            const result = await promise;

            expect(result).toBeDefined();
            expect(mockPage.waitForSelector).toHaveBeenCalledWith(
                '#department',
                expect.any(Object)
            );

            jest.useRealTimers();
        }, 20000);

        it('should click "Show More" button multiple times', async () => {
            jest.useFakeTimers();

            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>Test Promotion</span></h1></div>
                        <a href="/dp/B08N5WRWNW">Product 1</a>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.waitForFunction.mockResolvedValue({} as any);

            // Mock evaluate calls - now returns objects instead of numbers
            mockPage.evaluate
                // First click cycle
                .mockResolvedValueOnce({
                    dataAsin: 10,
                    productLinks: 20,
                    productCards: 15,
                    max: 20,
                }) // Count before first click
                .mockResolvedValueOnce(undefined) // Scroll (no return value)
                .mockResolvedValueOnce({ found: true, text: 'Mostrar mais', method: 'byId' }) // First click
                .mockResolvedValueOnce({
                    dataAsin: 15,
                    productLinks: 30,
                    productCards: 25,
                    max: 30,
                }) // Count after first click
                // Second click cycle
                .mockResolvedValueOnce({
                    dataAsin: 15,
                    productLinks: 30,
                    productCards: 25,
                    max: 30,
                }) // Count before second click
                .mockResolvedValueOnce(undefined) // Scroll (no return value)
                .mockResolvedValueOnce({ found: true, text: 'Mostrar mais', method: 'byId' }) // Second click
                .mockResolvedValueOnce({
                    dataAsin: 20,
                    productLinks: 40,
                    productCards: 35,
                    max: 40,
                }) // Count after second click
                // Third check - no more button
                .mockResolvedValueOnce({
                    dataAsin: 20,
                    productLinks: 40,
                    productCards: 35,
                    max: 40,
                }) // Count before third check
                .mockResolvedValueOnce(undefined) // Scroll (no return value)
                .mockResolvedValueOnce({ found: false, text: null, method: null }); // No more buttons

            const promotionPromise = repository.getPromotionById('ABC123');

            // Fast-forward through all timers (500ms scroll + 1000ms after click + 2000ms stability for each cycle)
            await jest.advanceTimersByTimeAsync(10000); // First cycle
            await jest.advanceTimersByTimeAsync(10000); // Second cycle
            await jest.advanceTimersByTimeAsync(10000); // Third check

            await promotionPromise;

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Clicked "Show More" button (1)')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Clicked "Show More" button (2)')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Products loaded: 20 -> 30')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Products loaded: 30 -> 40')
            );

            jest.useRealTimers();
        }, 15000);

        it('should throw PromotionNotFoundError when title is empty', async () => {
            const mockHtml = `
                <html>
                    <body>
                        <div>No promotion here</div>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.evaluate.mockResolvedValue(false);
            mockPage.waitForFunction.mockResolvedValue({} as any);

            await expect(repository.getPromotionById('INVALID')).rejects.toThrow(
                PromotionNotFoundError
            );

            expect(mockBrowser.close).toHaveBeenCalled();
        }, 10000);

        it('should throw ParsingError on puppeteer error', async () => {
            mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

            await expect(repository.getPromotionById('ABC123')).rejects.toThrow(ParsingError);
            await expect(repository.getPromotionById('ABC123')).rejects.toThrow(
                'Failed to scrape promotion ABC123'
            );

            expect(mockBrowser.close).toHaveBeenCalled();
        }, 10000);

        it('should throw ParsingError on unknown error', async () => {
            mockPage.goto.mockRejectedValue('String error');

            await expect(repository.getPromotionById('ABC123')).rejects.toThrow(ParsingError);
            await expect(repository.getPromotionById('ABC123')).rejects.toThrow('Unknown error');
        }, 10000);

        it('should handle waitForSelector timeout gracefully', async () => {
            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>Test Promotion 10% off</span></h1></div>
                        <a href="/dp/B08N5WRWNW">Product 1</a>
                    </body>
                </html>
            `;

            mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));
            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.evaluate.mockResolvedValue(false);
            mockPage.waitForFunction.mockResolvedValue({} as any);

            const promotion = await repository.getPromotionById('ABC123');

            expect(promotion).toBeDefined();
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Promotion content selectors not found')
            );
        }, 10000);

        it('should handle subcategory filter not found', async () => {
            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>Test Promotion</span></h1></div>
                        <a href="/dp/B08N5WRWNW">Product 1</a>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.waitForFunction.mockResolvedValue({} as any);
            mockPage.evaluate
                .mockResolvedValueOnce(false) // Subcategory filter not found - attempt 1
                .mockResolvedValueOnce(false) // Subcategory filter not found - attempt 2
                .mockResolvedValueOnce(false) // Subcategory filter not found - attempt 3
                .mockResolvedValue(false); // No "Show More" button

            await expect(
                repository.getPromotionById('ABC123', 'Livros', 'NonExistent')
            ).rejects.toThrow('Failed to apply subcategory filter "NonExistent" after 3 attempts');

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Attempt 1/3 failed'),
                expect.anything()
            );
        }, 10000);

        it('should handle subcategory filter error', async () => {
            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>Test Promotion</span></h1></div>
                        <a href="/dp/B08N5WRWNW">Product 1</a>
                    </body>
                </html>
            `;

            mockPage.waitForSelector.mockRejectedValue(new Error('Selector error'));
            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.evaluate.mockResolvedValue(false);
            mockPage.waitForFunction.mockResolvedValue({} as any);

            await expect(repository.getPromotionById('ABC123', 'Livros', 'Mangá')).rejects.toThrow(
                'Failed to apply subcategory filter "Mangá" after 3 attempts'
            );

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Attempt 1/3 failed'),
                expect.anything()
            );
        }, 10000);

        it('should handle "Show More" button click error', async () => {
            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>Test Promotion</span></h1></div>
                        <a href="/dp/B08N5WRWNW">Product 1</a>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.evaluate.mockRejectedValue(new Error('Click error'));
            mockPage.waitForFunction.mockResolvedValue({} as any);

            const promotion = await repository.getPromotionById('ABC123');

            expect(promotion).toBeDefined();
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Error clicking "Show More" button'),
                expect.anything()
            );
        }, 10000);

        it('should handle scroll error gracefully', async () => {
            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>Test Promotion</span></h1></div>
                        <a href="/dp/B08N5WRWNW">Product 1</a>
                    </body>
                </html>
            `;

            let callCount = 0;
            mockPage.evaluate.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve(false); // No "Show More" button
                }
                // Scroll evaluations throw error
                throw new Error('Scroll error');
            });
            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.waitForFunction.mockResolvedValue({} as any);

            const promotion = await repository.getPromotionById('ABC123');

            expect(promotion).toBeDefined();
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Error during scrolling'),
                expect.anything()
            );
        }, 10000);

        it('should limit "Show More" clicks to maximum', async () => {
            jest.useFakeTimers();
            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>Test Promotion</span></h1></div>
                        <a href="/dp/B08N5WRWNW">Product 1</a>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);

            // Mock evaluate to simulate 20 successful clicks
            // Pattern per click cycle: count products, scroll, click button, count after
            const evaluateCalls: any[] = [];
            for (let i = 0; i < 20; i++) {
                evaluateCalls.push(
                    // Count before
                    {
                        dataAsin: 10 + i,
                        productLinks: 20 + i * 2,
                        productCards: 15 + i,
                        max: 20 + i * 2,
                    },
                    // Scroll
                    undefined,
                    // Click button - always found
                    { found: true, text: 'Mostrar mais', method: 'byId' },
                    // Count after (same as before to simulate products not loading)
                    {
                        dataAsin: 10 + i,
                        productLinks: 20 + i * 2,
                        productCards: 15 + i,
                        max: 20 + i * 2,
                    }
                );
            }

            mockPage.evaluate.mockImplementation(() => {
                const result = evaluateCalls.shift();
                return Promise.resolve(result);
            });

            mockPage.waitForFunction.mockResolvedValue({} as any);

            const promotionPromise = repository.getPromotionById('ABC123');

            // Fast-forward through all the delays
            for (let i = 0; i < 20; i++) {
                await jest.advanceTimersByTimeAsync(10000); // All delays per cycle
            }

            await promotionPromise;

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Reached maximum "Show More" clicks')
            );

            jest.useRealTimers();
        }, 30000);
    });

    describe('extractSubcategories', () => {
        it('should extract subcategories successfully', async () => {
            const mockHtml = `
                <html>
                    <head><title>Test Promotion</title></head>
                    <body>
                        <div id="promotionTitle"><h1><span>20% off em Livros</span></h1></div>
                        <div id="promotionSchedule"><span>Válido de 01/01/2024 até 31/12/2024</span></div>
                        <div id="department">
                            <div name="subCategoryList">
                                <span data-name="departmentListSubCategoryItemText" data-value="Literatura e Ficção">Literatura e Ficção</span>
                                <span data-name="departmentListSubCategoryItemText" data-value="Romance">Romance</span>
                                <span data-name="departmentListSubCategoryItemText" data-value="Suspense">Suspense</span>
                            </div>
                        </div>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.evaluate.mockResolvedValue(['Literatura e Ficção', 'Romance', 'Suspense']);

            const result = await repository.extractSubcategories('ABC123', 'Livros');

            expect(result.subcategories).toHaveLength(3);
            expect(result.subcategories).toContain('Literatura e Ficção');
            expect(result.subcategories).toContain('Romance');
            expect(result.subcategories).toContain('Suspense');
            expect(result.promotion).toBeDefined();
            expect(result.promotion.id).toBe('ABC123');
            expect(result.promotion.description).toContain('20%');
            expect(mockBrowser.close).toHaveBeenCalled();
        }, 10000);

        it('should return empty subcategories when none found', async () => {
            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>10% off</span></h1></div>
                        <div id="department"></div>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.evaluate.mockResolvedValue([]);

            const result = await repository.extractSubcategories('ABC123', 'Livros');

            expect(result.subcategories).toHaveLength(0);
            expect(result.promotion).toBeDefined();
            expect(mockBrowser.close).toHaveBeenCalled();
        }, 10000);

        it('should filter out invalid subcategory texts', async () => {
            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>Test Promotion</span></h1></div>
                    </body>
                </html>
            `;

            mockPage.content.mockResolvedValue(mockHtml);
            mockPage.evaluate.mockResolvedValue([
                'Literatura e Ficção', // Valid
                'ver mais', // Should be filtered
                'mostrar', // Should be filtered
                '123', // Should be filtered (pure number)
                'Departamento', // Should be filtered
                'qualquer departamento', // Should be filtered
                'Romance', // Valid
                'ab', // Should be filtered (too short)
            ]);

            const result = await repository.extractSubcategories('ABC123', 'Livros');

            expect(result.subcategories).toHaveLength(2);
            expect(result.subcategories).toContain('Literatura e Ficção');
            expect(result.subcategories).toContain('Romance');
            expect(mockBrowser.close).toHaveBeenCalled();
        }, 10000);

        it('should retry on detached frame error', async () => {
            const mockHtml = `
                <html>
                    <body>
                        <div id="promotionTitle"><h1><span>Test Promotion</span></h1></div>
                    </body>
                </html>
            `;

            // First attempt fails with detached error, second succeeds
            let attemptCount = 0;
            mockPage.evaluate.mockImplementation(() => {
                attemptCount++;
                if (attemptCount === 1) {
                    throw new Error(
                        'Execution context was destroyed, most likely because of a detached'
                    );
                }
                return Promise.resolve(['Literatura e Ficção']);
            });
            mockPage.content.mockResolvedValue(mockHtml);

            const result = await repository.extractSubcategories('ABC123', 'Livros');

            expect(result.subcategories).toHaveLength(1);
            expect(result.subcategories).toContain('Literatura e Ficção');
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Frame detached error')
            );
            expect(mockBrowser.close).toHaveBeenCalledTimes(2); // Once for failed attempt, once for success
        }, 10000);

        it('should return fallback promotion on error after all retries', async () => {
            mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

            const result = await repository.extractSubcategories('ABC123', 'Livros');

            expect(result.subcategories).toHaveLength(0);
            expect(result.promotion).toBeDefined();
            expect(result.promotion.description).toContain('Scraping');
            expect(mockBrowser.close).toHaveBeenCalled();
        }, 10000);

        it('should handle non-detached errors without retry beyond max', async () => {
            mockPage.goto.mockRejectedValue(new Error('Some other error'));

            const result = await repository.extractSubcategories('ABC123', 'Livros');

            expect(result.subcategories).toHaveLength(0);
            expect(result.promotion).toBeDefined();
            expect(mockBrowser.close).toHaveBeenCalledTimes(1); // Only 1 call since non-detached error doesn't trigger retry
        }, 15000);
    });
});
