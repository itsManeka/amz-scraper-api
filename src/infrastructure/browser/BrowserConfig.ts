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
     * Gets optimized Puppeteer launch options for Render.com and low-memory environments
     */
    static getLaunchOptions(): {
        headless: boolean | 'new';
        args: string[];
        executablePath?: string;
    } {
        const options = {
            headless: 'new' as const, // Use new headless mode for better performance
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Overcome limited resource problems
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',

                // Memory optimization flags
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-client-side-phishing-detection',
                '--disable-component-update',
                '--disable-default-apps',
                '--disable-features=TranslateUI',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-renderer-backgrounding',
                '--disable-sync',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-default-browser-check',
                '--safebrowsing-disable-auto-update',
                '--password-store=basic',
                '--use-mock-keychain',

                // Memory reduction (removed --single-process to avoid frame detachment issues)
                '--disable-features=site-per-process', // Disable site isolation
                '--js-flags=--max-old-space-size=384', // Limit V8 heap to 384 MB (increased from 256)
            ],
        };

        // On Render.com or other production environments, use the Chrome installed by Puppeteer
        // The PUPPETEER_EXECUTABLE_PATH env var is set automatically after running:
        // npx puppeteer browsers install chrome
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            return {
                ...options,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            };
        }

        return options;
    }
}
