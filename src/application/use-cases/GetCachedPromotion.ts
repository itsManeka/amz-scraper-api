import { Promotion } from '../../domain/entities/Promotion';
import { ICache } from '../../infrastructure/cache/ICache';
import { StorageKeys } from '../../infrastructure/storage/StorageKeys';

/**
 * Use case for getting cached promotion data
 * Retrieves promotion from cache if available
 */
export class GetCachedPromotion {
    constructor(private readonly cache: ICache) {}

    /**
     * Executes the use case
     * @param promotionId - Promotion ID
     * @param category - Optional category filter
     * @param subcategory - Optional subcategory filter
     * @returns Promise resolving to Promotion entity or null if not cached
     * @throws {Error} If promotion ID is invalid
     */
    async execute(
        promotionId: string,
        category?: string,
        subcategory?: string
    ): Promise<Promotion | null> {
        if (!promotionId || typeof promotionId !== 'string' || promotionId.trim().length === 0) {
            throw new Error('Promotion ID is required and must be a non-empty string');
        }

        const cacheKey = StorageKeys.promotionKey(
            promotionId.trim(),
            category,
            subcategory
        );

        const cachedData = await this.cache.get<Promotion>(cacheKey);

        if (cachedData) {
            // Reconstruct Promotion entity with proper Date objects
            return new Promotion({
                ...cachedData,
                startDate: cachedData.startDate ? new Date(cachedData.startDate) : null,
                endDate: cachedData.endDate ? new Date(cachedData.endDate) : null,
            });
        }

        return null;
    }

    /**
     * Saves promotion to cache
     * @param promotion - Promotion entity to cache
     * @param category - Optional category filter
     * @param subcategory - Optional subcategory filter
     * @param ttlSeconds - Time to live in seconds (default: 1800 = 30 minutes)
     */
    async save(
        promotion: Promotion,
        category?: string,
        subcategory?: string,
        ttlSeconds: number = 1800
    ): Promise<void> {
        const cacheKey = StorageKeys.promotionKey(promotion.id, category, subcategory);
        await this.cache.set(cacheKey, promotion, ttlSeconds);
    }
}

