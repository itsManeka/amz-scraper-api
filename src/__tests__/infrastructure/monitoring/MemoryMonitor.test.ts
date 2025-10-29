import { MemoryMonitor } from '../../../infrastructure/monitoring/MemoryMonitor';

describe('MemoryMonitor', () => {
    describe('log', () => {
        it('should log memory usage with custom label', () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            MemoryMonitor.log('Test label');

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[Memory] Test label')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('RSS:'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Heap:'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('External:'));

            consoleLogSpy.mockRestore();
        });
    });

    describe('getStats', () => {
        it('should return memory statistics', () => {
            const stats = MemoryMonitor.getStats();

            expect(stats).toHaveProperty('rss');
            expect(stats).toHaveProperty('heapUsed');
            expect(stats).toHaveProperty('heapTotal');
            expect(stats).toHaveProperty('external');

            expect(typeof stats.rss).toBe('number');
            expect(typeof stats.heapUsed).toBe('number');
            expect(typeof stats.heapTotal).toBe('number');
            expect(typeof stats.external).toBe('number');

            expect(stats.rss).toBeGreaterThan(0);
            expect(stats.heapUsed).toBeGreaterThan(0);
            expect(stats.heapTotal).toBeGreaterThan(0);
        });
    });

    describe('forceGC', () => {
        it('should log warning when GC is not exposed', () => {
            const originalGC = global.gc;
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            // Remove GC temporarily
            delete (global as any).gc;

            MemoryMonitor.forceGC('Test GC');

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                '[Memory] GC not exposed - run with --expose-gc flag'
            );

            consoleWarnSpy.mockRestore();

            // Restore GC
            if (originalGC) {
                global.gc = originalGC;
            }
        });

        it('should force garbage collection and log results when GC is available', () => {
            const originalGC = global.gc;
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            // Mock GC function
            const mockGC = jest.fn();
            global.gc = mockGC;

            MemoryMonitor.forceGC('Test GC with exposed GC');

            expect(mockGC).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[Memory] GC triggered: Test GC with exposed GC')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Before:'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('After:'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Freed:'));

            consoleLogSpy.mockRestore();

            // Restore GC
            if (originalGC) {
                global.gc = originalGC;
            } else {
                delete (global as any).gc;
            }
        });
    });
});
