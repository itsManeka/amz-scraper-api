import { StorageKeys } from '../../../infrastructure/storage/StorageKeys';

describe('StorageKeys', () => {
    describe('PREFIXES', () => {
        it('should have correct promotion prefix', () => {
            expect(StorageKeys.PROMOTION_PREFIX).toBe('promotion:');
        });

        it('should have correct job prefix', () => {
            expect(StorageKeys.JOB_PREFIX).toBe('job:');
        });

        it('should have correct cache prefix', () => {
            expect(StorageKeys.CACHE_PREFIX).toBe('cache:');
        });
    });

    describe('promotionKey', () => {
        it('should generate key with only promotionId', () => {
            const key = StorageKeys.promotionKey('ABC123');

            expect(key).toBe('promotion::ABC123');
        });

        it('should generate key with promotionId and category', () => {
            const key = StorageKeys.promotionKey('ABC123', 'Electronics');

            expect(key).toBe('promotion::ABC123:Electronics');
        });

        it('should generate key with promotionId, category and subcategory', () => {
            const key = StorageKeys.promotionKey('ABC123', 'Electronics', 'Computers');

            expect(key).toBe('promotion::ABC123:Electronics:Computers');
        });

        it('should not include category separator when category is undefined', () => {
            const key = StorageKeys.promotionKey('ABC123', undefined);

            expect(key).toBe('promotion::ABC123');
            expect(key.split(':').length).toBe(3);
        });

        it('should not include subcategory when it is undefined', () => {
            const key = StorageKeys.promotionKey('ABC123', 'Electronics', undefined);

            expect(key).toBe('promotion::ABC123:Electronics');
            expect(key.split(':').length).toBe(4);
        });

        it('should generate unique keys for different inputs', () => {
            const key1 = StorageKeys.promotionKey('ABC123');
            const key2 = StorageKeys.promotionKey('ABC123', 'Electronics');
            const key3 = StorageKeys.promotionKey('XYZ789');

            expect(key1).not.toBe(key2);
            expect(key1).not.toBe(key3);
            expect(key2).not.toBe(key3);
        });
    });

    describe('jobKey', () => {
        it('should generate job key with prefix', () => {
            const key = StorageKeys.jobKey('job-123');

            expect(key).toBe('job:job-123');
        });

        it('should generate different keys for different job IDs', () => {
            const key1 = StorageKeys.jobKey('job-123');
            const key2 = StorageKeys.jobKey('job-456');

            expect(key1).not.toBe(key2);
        });

        it('should handle job IDs with special characters', () => {
            const key = StorageKeys.jobKey('job-abc-123_xyz');

            expect(key).toBe('job:job-abc-123_xyz');
        });
    });

    describe('cacheKey', () => {
        it('should generate cache key with prefix', () => {
            const key = StorageKeys.cacheKey('my-cache-key');

            expect(key).toBe('cache:my-cache-key');
        });

        it('should generate different keys for different cache keys', () => {
            const key1 = StorageKeys.cacheKey('key1');
            const key2 = StorageKeys.cacheKey('key2');

            expect(key1).not.toBe(key2);
        });

        it('should handle cache keys with special characters', () => {
            const key = StorageKeys.cacheKey('my:special:key-123');

            expect(key).toBe('cache:my:special:key-123');
        });
    });
});

