import { Promotion } from '../entities/Promotion';

export interface IPromotionRepository {
    getPromotionById(
        promotionId: string,
        productCategory?: string,
        productSubcategory?: string,
        maxClicks?: number
    ): Promise<Promotion>;
}
