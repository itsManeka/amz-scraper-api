import { BrowserConfig } from '../../../infrastructure/browser/BrowserConfig';

describe('BrowserConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getLaunchOptions', () => {
        it('should return default launch options without executable path', () => {
            delete process.env.PUPPETEER_EXECUTABLE_PATH;

            const options = BrowserConfig.getLaunchOptions();

            expect(options).toEqual({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
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
                    // Memory reduction (no single-process for stability)
                    '--disable-features=site-per-process',
                    '--js-flags=--max-old-space-size=384',
                ],
            });
            expect(options.executablePath).toBeUndefined();
        });

        it('should return launch options with executable path when env var is set', () => {
            const testPath = '/usr/bin/chromium';
            process.env.PUPPETEER_EXECUTABLE_PATH = testPath;

            const options = BrowserConfig.getLaunchOptions();

            expect(options).toEqual({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
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
                    // Memory reduction (no single-process for stability)
                    '--disable-features=site-per-process',
                    '--js-flags=--max-old-space-size=384',
                ],
                executablePath: testPath,
            });
        });

        it('should have headless mode set to new', () => {
            const options = BrowserConfig.getLaunchOptions();

            expect(options.headless).toBe('new');
        });

        it('should include necessary Chrome args', () => {
            const options = BrowserConfig.getLaunchOptions();

            // Basic required flags
            expect(options.args).toContain('--no-sandbox');
            expect(options.args).toContain('--disable-setuid-sandbox');
            expect(options.args).toContain('--disable-dev-shm-usage');
            expect(options.args).toContain('--disable-accelerated-2d-canvas');
            expect(options.args).toContain('--no-first-run');
            expect(options.args).toContain('--no-zygote');
            expect(options.args).toContain('--disable-gpu');

            // Memory optimization flags (not including --single-process for stability)
            expect(options.args).toContain('--disable-extensions');
            expect(options.args).toContain('--js-flags=--max-old-space-size=384');
        });
    });
});
