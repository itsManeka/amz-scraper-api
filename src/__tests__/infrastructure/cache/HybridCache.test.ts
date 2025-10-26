import NodeCache from 'node-cache';
import { HybridCache } from '../../../infrastructure/cache/HybridCache';
import { IStorage } from '../../../infrastructure/storage/IStorage';
import { StorageKeys } from '../../../infrastructure/storage/StorageKeys';

// Mock node-cache
jest.mock('node-cache');

describe('HybridCache', () => {
    let cache: HybridCache;
    let mockStorage: jest.Mocked<IStorage>;
    let mockNodeCache: jest.Mocked<NodeCache>;
    let expiredCallback: (key: string, value: any) => void;

    beforeEach(() => {
        jest.clearAllMocks();

        mockStorage = {
            save: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
            exists: jest.fn(),
            listKeys: jest.fn(),
            clear: jest.fn(),
        };

        mockNodeCache = {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            has: jest.fn(),
            keys: jest.fn().mockReturnValue([]),
            flushAll: jest.fn(),
            on: jest.fn((event, callback) => {
                if (event === 'expired') {
                    expiredCallback = callback;
                }
                return mockNodeCache;
            }),
        } as any;

        (NodeCache as jest.MockedClass<typeof NodeCache>).mockImplementation(() => mockNodeCache);
    });

    describe('constructor', () => {
        it('should create instance with default TTL and no storage', () => {
            cache = new HybridCache();

            expect(NodeCache).toHaveBeenCalledWith({
                stdTTL: 1800,
                checkperiod: 120,
                useClones: false,
            });
        });

        it('should create instance with custom TTL', () => {
            cache = new HybridCache(3600);

            expect(NodeCache).toHaveBeenCalledWith({
                stdTTL: 3600,
                checkperiod: 120,
                useClones: false,
            });
        });

        it('should create instance with storage', () => {
            cache = new HybridCache(1800, mockStorage);

            expect(NodeCache).toHaveBeenCalled();
        });

        it('should set up expired event listener', () => {
            cache = new HybridCache(1800, mockStorage);

            expect(mockNodeCache.on).toHaveBeenCalledWith('expired', expect.any(Function));
        });
    });

    describe('loadFromStorage', () => {
        beforeEach(() => {
            cache = new HybridCache(1800, mockStorage);
        });

        it('should do nothing if storage is not available', async () => {
            cache = new HybridCache(1800, null);

            await cache.loadFromStorage();

            expect(mockStorage.listKeys).not.toHaveBeenCalled();
        });

        it('should load valid cache entries from storage', async () => {
            const futureTime = Date.now() + 10000;
            mockStorage.listKeys.mockResolvedValue([
                'cache:test1',
                'cache:test2',
            ]);
            mockStorage.get
                .mockResolvedValueOnce({ value: 'value1', ttl: futureTime })
                .mockResolvedValueOnce({ value: 'value2', ttl: futureTime });

            await cache.loadFromStorage();

            expect(mockStorage.listKeys).toHaveBeenCalledWith(StorageKeys.CACHE_PREFIX);
            expect(mockNodeCache.set).toHaveBeenCalledWith('test1', 'value1', expect.any(Number));
            expect(mockNodeCache.set).toHaveBeenCalledWith('test2', 'value2', expect.any(Number));
        });

        it('should delete expired entries from storage', async () => {
            const pastTime = Date.now() - 10000;
            mockStorage.listKeys.mockResolvedValue(['cache:expired']);
            mockStorage.get.mockResolvedValue({ value: 'old', ttl: pastTime });

            await cache.loadFromStorage();

            expect(mockStorage.delete).toHaveBeenCalledWith('cache:expired');
            expect(mockNodeCache.set).not.toHaveBeenCalled();
        });

        it('should handle null data from storage', async () => {
            mockStorage.listKeys.mockResolvedValue(['cache:null']);
            mockStorage.get.mockResolvedValue(null);

            await cache.loadFromStorage();

            expect(mockNodeCache.set).not.toHaveBeenCalled();
        });

        it('should handle errors loading individual keys', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockStorage.listKeys.mockResolvedValue(['cache:error', 'cache:ok']);
            mockStorage.get
                .mockRejectedValueOnce(new Error('Storage error'))
                .mockResolvedValueOnce({ value: 'ok', ttl: Date.now() + 10000 });

            await cache.loadFromStorage();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to load cache key'),
                expect.anything()
            );
            expect(mockNodeCache.set).toHaveBeenCalledWith('ok', 'ok', expect.any(Number));

            consoleErrorSpy.mockRestore();
        });

        it('should handle errors listing keys', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockStorage.listKeys.mockRejectedValue(new Error('Storage error'));

            await cache.loadFromStorage();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to load cache from storage'),
                expect.anything()
            );

            consoleErrorSpy.mockRestore();
        });

        it('should log loaded count', async () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            mockStorage.listKeys.mockResolvedValue(['cache:test']);
            mockStorage.get.mockResolvedValue({ value: 'value', ttl: Date.now() + 10000 });

            await cache.loadFromStorage();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Loaded 1 cache entries from storage')
            );

            consoleLogSpy.mockRestore();
        });
    });

    describe('set', () => {
        beforeEach(() => {
            cache = new HybridCache(1800, mockStorage);
        });

        it('should set value in memory cache', async () => {
            await cache.set('key', 'value', 600);

            expect(mockNodeCache.set).toHaveBeenCalledWith('key', 'value', 600);
        });

        it('should use default TTL if not provided', async () => {
            await cache.set('key', 'value');

            expect(mockNodeCache.set).toHaveBeenCalledWith('key', 'value', 1800);
        });

        it('should backup to storage', async () => {
            await cache.set('key', 'value', 600);

            expect(mockStorage.save).toHaveBeenCalledWith(
                StorageKeys.cacheKey('key'),
                {
                    value: 'value',
                    ttl: expect.any(Number),
                }
            );
        });

        it('should not throw if storage backup fails', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockStorage.save.mockRejectedValue(new Error('Storage error'));

            await expect(cache.set('key', 'value')).resolves.not.toThrow();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to backup cache to storage'),
                expect.anything()
            );

            consoleErrorSpy.mockRestore();
        });

        it('should work without storage', async () => {
            cache = new HybridCache(1800, null);

            await expect(cache.set('key', 'value')).resolves.not.toThrow();

            expect(mockNodeCache.set).toHaveBeenCalledWith('key', 'value', 1800);
        });
    });

    describe('get', () => {
        beforeEach(() => {
            cache = new HybridCache(1800, mockStorage);
        });

        it('should return value from memory cache', async () => {
            mockNodeCache.get.mockReturnValue('value');

            const result = await cache.get('key');

            expect(result).toBe('value');
            expect(mockNodeCache.get).toHaveBeenCalledWith('key');
        });

        it('should return null if key not found', async () => {
            mockNodeCache.get.mockReturnValue(undefined);

            const result = await cache.get('key');

            expect(result).toBeNull();
        });

        it('should track cache hits', async () => {
            mockNodeCache.get.mockReturnValue('value');

            await cache.get('key');
            const stats = await cache.getStats();

            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(0);
        });

        it('should track cache misses', async () => {
            mockNodeCache.get.mockReturnValue(undefined);

            await cache.get('key');
            const stats = await cache.getStats();

            expect(stats.hits).toBe(0);
            expect(stats.misses).toBe(1);
        });
    });

    describe('delete', () => {
        beforeEach(() => {
            cache = new HybridCache(1800, mockStorage);
        });

        it('should delete from memory cache', async () => {
            await cache.delete('key');

            expect(mockNodeCache.del).toHaveBeenCalledWith('key');
        });

        it('should delete from storage', async () => {
            await cache.delete('key');

            expect(mockStorage.delete).toHaveBeenCalledWith(StorageKeys.cacheKey('key'));
        });

        it('should not throw if storage delete fails', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockStorage.delete.mockRejectedValue(new Error('Storage error'));

            await expect(cache.delete('key')).resolves.not.toThrow();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to delete cache from storage'),
                expect.anything()
            );

            consoleErrorSpy.mockRestore();
        });

        it('should work without storage', async () => {
            cache = new HybridCache(1800, null);

            await expect(cache.delete('key')).resolves.not.toThrow();

            expect(mockNodeCache.del).toHaveBeenCalledWith('key');
        });
    });

    describe('has', () => {
        beforeEach(() => {
            cache = new HybridCache(1800, mockStorage);
        });

        it('should return true if key exists', async () => {
            mockNodeCache.has.mockReturnValue(true);

            const result = await cache.has('key');

            expect(result).toBe(true);
            expect(mockNodeCache.has).toHaveBeenCalledWith('key');
        });

        it('should return false if key does not exist', async () => {
            mockNodeCache.has.mockReturnValue(false);

            const result = await cache.has('key');

            expect(result).toBe(false);
        });
    });

    describe('clear', () => {
        beforeEach(() => {
            cache = new HybridCache(1800, mockStorage);
        });

        it('should clear all cache entries', async () => {
            await cache.clear();

            expect(mockNodeCache.flushAll).toHaveBeenCalled();
            expect(mockStorage.clear).toHaveBeenCalledWith(StorageKeys.CACHE_PREFIX);
        });

        it('should clear cache with prefix', async () => {
            mockNodeCache.keys.mockReturnValue(['prefix:key1', 'prefix:key2', 'other:key']);

            await cache.clear('prefix:');

            expect(mockNodeCache.del).toHaveBeenCalledWith(['prefix:key1', 'prefix:key2']);
            expect(mockStorage.clear).toHaveBeenCalledWith(StorageKeys.cacheKey('prefix:'));
        });

        it('should work without storage', async () => {
            cache = new HybridCache(1800, null);

            await expect(cache.clear()).resolves.not.toThrow();

            expect(mockNodeCache.flushAll).toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        beforeEach(() => {
            cache = new HybridCache(1800, mockStorage);
        });

        it('should return cache statistics', async () => {
            mockNodeCache.get
                .mockReturnValueOnce('value')
                .mockReturnValueOnce(undefined);
            mockNodeCache.keys.mockReturnValue(['key1', 'key2', 'key3']);

            await cache.get('hit');
            await cache.get('miss');

            const stats = await cache.getStats();

            expect(stats).toEqual({
                hits: 1,
                misses: 1,
                keys: 3,
            });
        });
    });

    describe('expired event handler', () => {
        beforeEach(() => {
            cache = new HybridCache(1800, mockStorage);
        });

        it('should delete expired key from storage', async () => {
            expiredCallback('expired:key', 'value');

            // Wait for async operation
            await new Promise(setImmediate);

            expect(mockStorage.delete).toHaveBeenCalledWith(StorageKeys.cacheKey('expired:key'));
        });

        it('should handle deletion errors', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockStorage.delete.mockRejectedValue(new Error('Storage error'));

            expiredCallback('expired:key', 'value');

            // Wait for async operation
            await new Promise(setImmediate);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to delete cache from storage'),
                expect.anything()
            );

            consoleErrorSpy.mockRestore();
        });
    });
});

