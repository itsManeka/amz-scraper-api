import NodeCache from 'node-cache';
import { ICache } from './ICache';
import { IStorage } from '../storage/IStorage';
import { StorageKeys } from '../storage/StorageKeys';

/**
 * Hybrid cache implementation combining in-memory cache with file-based backup
 * Uses node-cache for fast in-memory access with optional persistent storage backup
 */
export class HybridCache implements ICache {
    private readonly memoryCache: NodeCache;
    private readonly storage: IStorage | null;
    private hits = 0;
    private misses = 0;

    /**
     * Creates a new HybridCache instance
     * @param defaultTtlSeconds - Default TTL in seconds (default: 1800 = 30 minutes)
     * @param storage - Optional storage for cache backup
     */
    constructor(defaultTtlSeconds: number = 1800, storage: IStorage | null = null) {
        this.memoryCache = new NodeCache({
            stdTTL: defaultTtlSeconds,
            checkperiod: 120, // Check for expired keys every 2 minutes
            useClones: false, // Don't clone objects for better performance
        });
        this.storage = storage;

        // Set up cleanup on expired keys to remove from storage
        this.memoryCache.on('expired', (key: string) => {
            this.deleteFromStorage(key).catch((error) => {
                console.error(`[HybridCache] Failed to delete expired key from storage: ${key}`, error);
            });
        });
    }

    /**
     * Loads cache from storage backup
     * Should be called during initialization
     */
    async loadFromStorage(): Promise<void> {
        if (!this.storage) {
            return;
        }

        try {
            const keys = await this.storage.listKeys(StorageKeys.CACHE_PREFIX);
            let loadedCount = 0;

            for (const key of keys) {
                try {
                    const data = await this.storage.get<{ value: unknown; ttl: number }>(key);
                    if (data) {
                        const cacheKey = key.replace(StorageKeys.CACHE_PREFIX, '');
                        const remainingTtl = Math.max(0, data.ttl - Date.now());

                        if (remainingTtl > 0) {
                            this.memoryCache.set(
                                cacheKey,
                                data.value,
                                Math.floor(remainingTtl / 1000)
                            );
                            loadedCount++;
                        } else {
                            // Delete expired cache from storage
                            await this.storage.delete(key);
                        }
                    }
                } catch (error) {
                    console.error(`[HybridCache] Failed to load cache key: ${key}`, error);
                }
            }

            console.log(`[HybridCache] Loaded ${loadedCount} cache entries from storage`);
        } catch (error) {
            console.error('[HybridCache] Failed to load cache from storage', error);
        }
    }

    /**
     * Sets a value in cache
     */
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        const ttl = ttlSeconds !== undefined ? ttlSeconds : 1800;
        this.memoryCache.set(key, value, ttl);

        // Backup to storage if available
        if (this.storage) {
            try {
                const expiryTime = Date.now() + ttl * 1000;
                await this.storage.save(StorageKeys.cacheKey(key), {
                    value,
                    ttl: expiryTime,
                });
            } catch (error) {
                console.error(`[HybridCache] Failed to backup cache to storage: ${key}`, error);
            }
        }
    }

    /**
     * Gets a value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        const value = this.memoryCache.get<T>(key);

        if (value !== undefined) {
            this.hits++;
            return value;
        }

        this.misses++;
        return null;
    }

    /**
     * Deletes a value from cache
     */
    async delete(key: string): Promise<void> {
        this.memoryCache.del(key);
        await this.deleteFromStorage(key);
    }

    /**
     * Checks if a key exists in cache
     */
    async has(key: string): Promise<boolean> {
        return this.memoryCache.has(key);
    }

    /**
     * Clears all cache entries
     */
    async clear(prefix?: string): Promise<void> {
        if (prefix) {
            const keys = this.memoryCache.keys().filter((key) => key.startsWith(prefix));
            this.memoryCache.del(keys);

            // Clear from storage
            if (this.storage) {
                await this.storage.clear(StorageKeys.cacheKey(prefix));
            }
        } else {
            this.memoryCache.flushAll();

            // Clear from storage
            if (this.storage) {
                await this.storage.clear(StorageKeys.CACHE_PREFIX);
            }
        }
    }

    /**
     * Gets cache statistics
     */
    async getStats(): Promise<{ hits: number; misses: number; keys: number }> {
        return {
            hits: this.hits,
            misses: this.misses,
            keys: this.memoryCache.keys().length,
        };
    }

    /**
     * Deletes a key from storage
     * @param key - Cache key
     */
    private async deleteFromStorage(key: string): Promise<void> {
        if (!this.storage) {
            return;
        }

        try {
            await this.storage.delete(StorageKeys.cacheKey(key));
        } catch (error) {
            console.error(`[HybridCache] Failed to delete cache from storage: ${key}`, error);
        }
    }
}

