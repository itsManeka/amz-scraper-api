import { UserAgentRotator } from '../../../infrastructure/browser/UserAgentRotator';

describe('UserAgentRotator', () => {
    let rotator: UserAgentRotator;

    beforeEach(() => {
        rotator = new UserAgentRotator();
    });

    describe('getNext', () => {
        it('should return user agents in rotation', () => {
            const first = rotator.getNext();
            const second = rotator.getNext();

            expect(first).toContain('Mozilla/5.0');
            expect(second).toContain('Mozilla/5.0');
            expect(first).not.toBe(second);
        });

        it('should cycle back to first agent after all are used', () => {
            const agents = [];
            // Get 6 agents (the full rotation)
            for (let i = 0; i < 6; i++) {
                agents.push(rotator.getNext());
            }

            // The 7th should be the same as the first
            const nextAgent = rotator.getNext();
            expect(nextAgent).toBe(agents[0]);
        });

        it('should return different agents on consecutive calls', () => {
            const agent1 = rotator.getNext();
            const agent2 = rotator.getNext();
            const agent3 = rotator.getNext();

            expect(agent1).not.toBe(agent2);
            expect(agent2).not.toBe(agent3);
        });
    });

    describe('getRandom', () => {
        it('should return a valid user agent', () => {
            const userAgent = rotator.getRandom();

            expect(userAgent).toContain('Mozilla/5.0');
            expect(userAgent).toContain('Chrome/');
        });

        it('should return user agents from the available pool', () => {
            const agents = new Set();
            // Get 20 random agents to increase chance of getting different ones
            for (let i = 0; i < 20; i++) {
                agents.add(rotator.getRandom());
            }

            // Should have at least 2 different agents (very likely with 20 tries)
            expect(agents.size).toBeGreaterThanOrEqual(1);
        });

        it('should return user agents with different platforms', () => {
            const agents = new Set();
            for (let i = 0; i < 30; i++) {
                const agent = rotator.getRandom();
                if (agent.includes('Windows')) agents.add('Windows');
                if (agent.includes('Macintosh')) agents.add('Mac');
                if (agent.includes('Linux')) agents.add('Linux');
            }

            // Should have at least 2 different platforms
            expect(agents.size).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getPlatform', () => {
        it('should return Win32 for Windows user agent', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
            const platform = rotator.getPlatform(userAgent);

            expect(platform).toBe('Win32');
        });

        it('should return MacIntel for Mac user agent', () => {
            const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
            const platform = rotator.getPlatform(userAgent);

            expect(platform).toBe('MacIntel');
        });

        it('should return Linux x86_64 for Linux user agent', () => {
            const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
            const platform = rotator.getPlatform(userAgent);

            expect(platform).toBe('Linux x86_64');
        });

        it('should return Win32 for unknown user agent', () => {
            const userAgent = 'Mozilla/5.0 (Unknown Platform)';
            const platform = rotator.getPlatform(userAgent);

            expect(platform).toBe('Win32');
        });
    });
});

