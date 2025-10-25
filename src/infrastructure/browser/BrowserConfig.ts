/**
 * Browser configuration with rotation strategies
 */
export interface BrowserOptions {
    userAgent?: string;
    viewport?: { width: number; height: number };
    headers?: Record<string, string>;
}

/**
 * Browser configuration helper
 */
export class BrowserConfig {
    /**
     * Gets optimized Puppeteer launch options for Render.com
     */
    static getLaunchOptions(): {
        headless: boolean | 'new';
        args: string[];
    } {
        return {
            headless: 'new', // Use new headless mode for better performance
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Overcome limited resource problems
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
            ],
        };
    }
}

