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
                .mockResolvedValueOnce(true) // Subcategory filter found and clicked
                .mockResolvedValue(false); // No "Show More" button

            await repository.getPromotionById('ABC123', 'Livros', 'Mangá');

            expect(mockPage.waitForSelector).toHaveBeenCalledWith(
                '[data-csa-c-element-id*="filter"]',
                expect.any(Object)
            );
        }, 10000);

        it('should click "Show More" button multiple times', async () => {
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
                .mockResolvedValueOnce(10) // Product count before first click
                .mockResolvedValueOnce(true) // First click button found
                .mockResolvedValueOnce(15) // Product count after first click
                .mockResolvedValueOnce(15) // Product count before second click
                .mockResolvedValueOnce(true) // Second click button found
                .mockResolvedValueOnce(20) // Product count after second click
                .mockResolvedValueOnce(20) // Product count before third check
                .mockResolvedValueOnce(false); // No more buttons

            await repository.getPromotionById('ABC123');

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Clicked "Show More" button (1)')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Clicked "Show More" button (2)')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Products loaded: 10 -> 15')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Products loaded: 15 -> 20')
            );
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
                .mockResolvedValueOnce(false) // Subcategory filter not found
                .mockResolvedValue(false); // No "Show More" button

            await repository.getPromotionById('ABC123', 'Livros', 'NonExistent');

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Subcategory filter not found')
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

            await repository.getPromotionById('ABC123', 'Livros', 'Mangá');

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Error applying subcategory filter'),
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

            // Mock evaluate to return increasing product counts for each call
            let evaluateCallCount = 0;
            mockPage.evaluate.mockImplementation(() => {
                evaluateCallCount++;
                // Every odd call is for counting products (before click)
                // Every even call is for clicking button
                if (evaluateCallCount % 2 === 1) {
                    return Promise.resolve(evaluateCallCount); // Product count
                } else {
                    return Promise.resolve(true); // Button found
                }
            });

            mockPage.waitForFunction.mockResolvedValue({} as any);

            const promotionPromise = repository.getPromotionById('ABC123');

            // Fast-forward through all the delays
            for (let i = 0; i < 20; i++) {
                await jest.advanceTimersByTimeAsync(7000); // 5s wait + 2s delay
            }

            await promotionPromise;

            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Reached maximum "Show More" clicks')
            );

            jest.useRealTimers();
        }, 30000);
    });
});
