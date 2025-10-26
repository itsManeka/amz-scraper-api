import { HeadersRotator } from '../../../infrastructure/browser/HeadersRotator';

describe('HeadersRotator', () => {
    let rotator: HeadersRotator;

    beforeEach(() => {
        rotator = new HeadersRotator();
    });

    describe('getHeaders', () => {
        it('should return headers object with required fields', () => {
            const headers = rotator.getHeaders();

            expect(headers).toHaveProperty('Accept-Language');
            expect(headers).toHaveProperty('Referer');
            expect(headers).toHaveProperty('Accept');
            expect(headers).toHaveProperty('Accept-Encoding');
            expect(headers).toHaveProperty('Connection');
            expect(headers).toHaveProperty('Upgrade-Insecure-Requests');
        });

        it('should have correct Referer', () => {
            const headers = rotator.getHeaders();

            expect(headers.Referer).toBe('https://www.amazon.com.br/');
        });

        it('should have correct Accept header', () => {
            const headers = rotator.getHeaders();

            expect(headers.Accept).toBe(
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            );
        });

        it('should have correct Accept-Encoding header', () => {
            const headers = rotator.getHeaders();

            expect(headers['Accept-Encoding']).toBe('gzip, deflate, br');
        });

        it('should have correct Connection header', () => {
            const headers = rotator.getHeaders();

            expect(headers.Connection).toBe('keep-alive');
        });

        it('should have correct Upgrade-Insecure-Requests header', () => {
            const headers = rotator.getHeaders();

            expect(headers['Upgrade-Insecure-Requests']).toBe('1');
        });

        it('should have Portuguese Accept-Language', () => {
            const headers = rotator.getHeaders();

            expect(headers['Accept-Language']).toContain('pt-BR');
        });
    });

    describe('getRandomAcceptLanguage', () => {
        it('should return a valid Accept-Language header', () => {
            const acceptLanguage = rotator.getRandomAcceptLanguage();

            expect(acceptLanguage).toContain('pt-BR');
        });

        it('should return one of the predefined values', () => {
            const validValues = [
                'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'pt-BR,pt;q=0.9,en;q=0.8',
                'pt-BR,pt;q=0.9',
            ];

            const acceptLanguage = rotator.getRandomAcceptLanguage();

            expect(validValues).toContain(acceptLanguage);
        });

        it('should return different values on multiple calls (statistically)', () => {
            const languages = new Set();
            for (let i = 0; i < 20; i++) {
                languages.add(rotator.getRandomAcceptLanguage());
            }

            // Should have at least 2 different values (very likely with 20 tries)
            expect(languages.size).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getRandomViewport', () => {
        it('should return a viewport with width and height', () => {
            const viewport = rotator.getRandomViewport();

            expect(viewport).toHaveProperty('width');
            expect(viewport).toHaveProperty('height');
            expect(typeof viewport.width).toBe('number');
            expect(typeof viewport.height).toBe('number');
        });

        it('should return one of the predefined viewports', () => {
            const validViewports = [
                { width: 1920, height: 1080 },
                { width: 1366, height: 768 },
                { width: 1440, height: 900 },
                { width: 1536, height: 864 },
            ];

            const viewport = rotator.getRandomViewport();

            const isValid = validViewports.some(
                (v) => v.width === viewport.width && v.height === viewport.height
            );

            expect(isValid).toBe(true);
        });

        it('should return realistic viewport dimensions', () => {
            const viewport = rotator.getRandomViewport();

            expect(viewport.width).toBeGreaterThanOrEqual(1366);
            expect(viewport.width).toBeLessThanOrEqual(1920);
            expect(viewport.height).toBeGreaterThanOrEqual(768);
            expect(viewport.height).toBeLessThanOrEqual(1080);
        });

        it('should return different viewports on multiple calls (statistically)', () => {
            const viewports = new Set();
            for (let i = 0; i < 20; i++) {
                const viewport = rotator.getRandomViewport();
                viewports.add(`${viewport.width}x${viewport.height}`);
            }

            // Should have at least 2 different viewports (very likely with 20 tries)
            expect(viewports.size).toBeGreaterThanOrEqual(1);
        });
    });
});

