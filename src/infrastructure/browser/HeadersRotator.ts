/**
 * HTTP headers rotation for browser fingerprinting
 */
export class HeadersRotator {
    private static readonly ACCEPT_LANGUAGES = [
        'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'pt-BR,pt;q=0.9,en;q=0.8',
        'pt-BR,pt;q=0.9',
    ];

    private static readonly VIEWPORTS = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1536, height: 864 },
    ];

    /**
     * Gets randomized headers
     */
    getHeaders(): Record<string, string> {
        return {
            'Accept-Language': this.getRandomAcceptLanguage(),
            Referer: 'https://www.amazon.com.br/',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        };
    }

    /**
     * Gets a random accept-language header
     */
    getRandomAcceptLanguage(): string {
        return HeadersRotator.ACCEPT_LANGUAGES[
            Math.floor(Math.random() * HeadersRotator.ACCEPT_LANGUAGES.length)
        ];
    }

    /**
     * Gets a random viewport size
     */
    getRandomViewport(): { width: number; height: number } {
        return HeadersRotator.VIEWPORTS[
            Math.floor(Math.random() * HeadersRotator.VIEWPORTS.length)
        ];
    }
}
