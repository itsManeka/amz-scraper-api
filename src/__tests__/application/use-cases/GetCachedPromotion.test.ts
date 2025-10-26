import { GetCachedPromotion } from '../../../application/use-cases/GetCachedPromotion';
import { Promotion } from '../../../domain/entities/Promotion';
import { ICache } from '../../../infrastructure/cache/ICache';
import { StorageKeys } from '../../../infrastructure/storage/StorageKeys';

describe('GetCachedPromotion Use Case', () => {
    let useCase: GetCachedPromotion;
    let mockCache: jest.Mocked<ICache>;

    beforeEach(() => {
        mockCache = {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            has: jest.fn(),
            clear: jest.fn(),
            getStats: jest.fn(),
        } as jest.Mocked<ICache>;

        useCase = new GetCachedPromotion(mockCache);
    });

    describe('execute', () => {
        it('should retrieve promotion from cache', async () => {
            const cachedData = {
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage' as const,
                discountValue: 20,
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                asins: ['B08N5WRWNW'],
            };

            mockCache.get.mockResolvedValue(cachedData);

            const result = await useCase.execute('ABC123');

            expect(mockCache.get).toHaveBeenCalledWith(
                StorageKeys.promotionKey('ABC123', undefined, undefined)
            );
            expect(result).toBeInstanceOf(Promotion);
            expect(result?.id).toBe('ABC123');
            expect(result?.startDate).toBeInstanceOf(Date);
            expect(result?.endDate).toBeInstanceOf(Date);
        });

        it('should retrieve promotion from cache with category', async () => {
            const cachedData = {
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage' as const,
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            };

            mockCache.get.mockResolvedValue(cachedData);

            const result = await useCase.execute('ABC123', 'Electronics');

            expect(mockCache.get).toHaveBeenCalledWith(
                StorageKeys.promotionKey('ABC123', 'Electronics', undefined)
            );
            expect(result).toBeInstanceOf(Promotion);
        });

        it('should retrieve promotion from cache with category and subcategory', async () => {
            const cachedData = {
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage' as const,
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            };

            mockCache.get.mockResolvedValue(cachedData);

            const result = await useCase.execute('ABC123', 'Electronics', 'Computers');

            expect(mockCache.get).toHaveBeenCalledWith(
                StorageKeys.promotionKey('ABC123', 'Electronics', 'Computers')
            );
            expect(result).toBeInstanceOf(Promotion);
        });

        it('should return null when promotion not in cache', async () => {
            mockCache.get.mockResolvedValue(null);

            const result = await useCase.execute('ABC123');

            expect(mockCache.get).toHaveBeenCalledWith(
                StorageKeys.promotionKey('ABC123', undefined, undefined)
            );
            expect(result).toBeNull();
        });

        it('should handle null dates correctly', async () => {
            const cachedData = {
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage' as const,
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            };

            mockCache.get.mockResolvedValue(cachedData);

            const result = await useCase.execute('ABC123');

            expect(result?.startDate).toBeNull();
            expect(result?.endDate).toBeNull();
        });

        it('should trim whitespace from promotionId', async () => {
            const cachedData = {
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage' as const,
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            };

            mockCache.get.mockResolvedValue(cachedData);

            await useCase.execute('  ABC123  ');

            expect(mockCache.get).toHaveBeenCalledWith(
                StorageKeys.promotionKey('ABC123', undefined, undefined)
            );
        });

        it('should throw error if promotionId is empty', async () => {
            await expect(useCase.execute('')).rejects.toThrow(
                'Promotion ID is required and must be a non-empty string'
            );
        });

        it('should throw error if promotionId is whitespace only', async () => {
            await expect(useCase.execute('   ')).rejects.toThrow(
                'Promotion ID is required and must be a non-empty string'
            );
        });

        it('should throw error if promotionId is not a string', async () => {
            await expect(useCase.execute(123 as any)).rejects.toThrow(
                'Promotion ID is required and must be a non-empty string'
            );
        });
    });

    describe('save', () => {
        it('should save promotion to cache', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage',
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            });

            await useCase.save(promotion);

            expect(mockCache.set).toHaveBeenCalledWith(
                StorageKeys.promotionKey('ABC123', undefined, undefined),
                promotion,
                1800
            );
        });

        it('should save promotion to cache with category', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage',
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            });

            await useCase.save(promotion, 'Electronics');

            expect(mockCache.set).toHaveBeenCalledWith(
                StorageKeys.promotionKey('ABC123', 'Electronics', undefined),
                promotion,
                1800
            );
        });

        it('should save promotion to cache with category and subcategory', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage',
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            });

            await useCase.save(promotion, 'Electronics', 'Computers');

            expect(mockCache.set).toHaveBeenCalledWith(
                StorageKeys.promotionKey('ABC123', 'Electronics', 'Computers'),
                promotion,
                1800
            );
        });

        it('should save promotion with custom TTL', async () => {
            const promotion = new Promotion({
                id: 'ABC123',
                description: 'Test Promotion',
                details: 'Test Details',
                discountType: 'percentage',
                discountValue: 20,
                startDate: null,
                endDate: null,
                asins: ['B08N5WRWNW'],
            });

            await useCase.save(promotion, undefined, undefined, 3600);

            expect(mockCache.set).toHaveBeenCalledWith(
                StorageKeys.promotionKey('ABC123', undefined, undefined),
                promotion,
                3600
            );
        });
    });
});

