/**
 * Constants for storage keys to maintain consistency
 */
export class StorageKeys {
    /**
     * Prefix for promotion data
     */
    static readonly PROMOTION_PREFIX = 'promotion:';

    /**
     * Prefix for job data
     */
    static readonly JOB_PREFIX = 'job:';

    /**
     * Prefix for cache backup data
     */
    static readonly CACHE_PREFIX = 'cache:';

    /**
     * Generates a promotion storage key
     * @param promotionId - The promotion ID
     * @param category - Optional category filter
     * @param subcategory - Optional subcategory filter
     * @returns Storage key
     */
    static promotionKey(
        promotionId: string,
        category?: string,
        subcategory?: string
    ): string {
        const parts = [this.PROMOTION_PREFIX, promotionId];
        if (category) {
            parts.push(category);
        }
        if (subcategory) {
            parts.push(subcategory);
        }
        return parts.join(':');
    }

    /**
     * Generates a job storage key
     * @param jobId - The job ID
     * @returns Storage key
     */
    static jobKey(jobId: string): string {
        return `${this.JOB_PREFIX}${jobId}`;
    }

    /**
     * Generates a cache storage key
     * @param cacheKey - The cache key
     * @returns Storage key
     */
    static cacheKey(cacheKey: string): string {
        return `${this.CACHE_PREFIX}${cacheKey}`;
    }
}

