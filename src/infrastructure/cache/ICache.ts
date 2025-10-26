/**
 * Cache interface for temporary data storage
 * Provides in-memory caching with optional TTL
 */
export interface ICache {
    /**
     * Sets a value in cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttlSeconds - Time to live in seconds (optional)
     */
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

    /**
     * Gets a value from cache
     * @param key - Cache key
     * @returns Cached value or null if not found or expired
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Deletes a value from cache
     * @param key - Cache key
     */
    delete(key: string): Promise<void>;

    /**
     * Checks if a key exists in cache
     * @param key - Cache key
     * @returns true if key exists and not expired, false otherwise
     */
    has(key: string): Promise<boolean>;

    /**
     * Clears all cache entries
     * @param prefix - Optional prefix to clear only matching keys
     */
    clear(prefix?: string): Promise<void>;

    /**
     * Gets cache statistics
     * @returns Object with cache statistics
     */
    getStats(): Promise<{ hits: number; misses: number; keys: number }>;
}
