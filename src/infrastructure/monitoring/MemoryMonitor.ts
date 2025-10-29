/**
 * Memory monitoring utility for tracking memory usage
 * Helps identify memory leaks and optimize garbage collection
 */
export class MemoryMonitor {
    /**
     * Logs current memory usage with a custom label
     */
    static log(label: string): void {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
        const rssMB = Math.round(usage.rss / 1024 / 1024);
        const externalMB = Math.round(usage.external / 1024 / 1024);

        console.log(
            `[Memory] ${label} | RSS: ${rssMB}MB | Heap: ${heapUsedMB}/${heapTotalMB}MB | External: ${externalMB}MB`
        );
    }

    /**
     * Gets memory usage statistics
     */
    static getStats(): {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
    } {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024),
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024),
        };
    }

    /**
     * Forces garbage collection and logs memory before/after
     */
    static forceGC(label: string): void {
        if (!global.gc) {
            console.warn('[Memory] GC not exposed - run with --expose-gc flag');
            return;
        }

        const before = this.getStats();
        global.gc();
        const after = this.getStats();

        const freedMB = before.heapUsed - after.heapUsed;
        console.log(
            `[Memory] GC triggered: ${label} | Before: ${before.heapUsed}MB → After: ${after.heapUsed}MB | Freed: ${freedMB}MB`
        );
    }
}
