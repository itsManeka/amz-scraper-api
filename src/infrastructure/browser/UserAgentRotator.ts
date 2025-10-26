/**
 * User-Agent rotation for browser fingerprinting
 */
export class UserAgentRotator {
    private static readonly USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    ];

    private currentIndex = 0;

    /**
     * Gets the next user agent in rotation
     */
    getNext(): string {
        const userAgent = UserAgentRotator.USER_AGENTS[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % UserAgentRotator.USER_AGENTS.length;
        return userAgent;
    }

    /**
     * Gets a random user agent
     */
    getRandom(): string {
        const randomIndex = Math.floor(Math.random() * UserAgentRotator.USER_AGENTS.length);
        return UserAgentRotator.USER_AGENTS[randomIndex];
    }

    /**
     * Gets the platform from user agent
     */
    getPlatform(userAgent: string): string {
        if (userAgent.includes('Windows')) {
            return 'Win32';
        } else if (userAgent.includes('Macintosh')) {
            return 'MacIntel';
        } else if (userAgent.includes('Linux')) {
            return 'Linux x86_64';
        }
        return 'Win32';
    }
}
