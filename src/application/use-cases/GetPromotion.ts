import { Promotion } from '../../domain/entities/Promotion';
import { IPromotionRepository } from '../../domain/repositories/IPromotionRepository';

/**
 * Use case for retrieving a promotion by ID
 * Orchestrates the retrieval of promotion details and products
 */
export class GetPromotion {
    private readonly promotionRepository: IPromotionRepository;

    constructor(promotionRepository: IPromotionRepository) {
        this.promotionRepository = promotionRepository;
    }

    /**
     * Executes the use case to get a promotion
     * @param promotionId - The promotion ID
     * @param productCategory - Optional category filter (e.g., 'Livros')
     * @param productSubcategory - Optional subcategory filter (e.g., 'Mangá HQs, Mangás e Graphic Novels')
     * @returns Promise resolving to Promotion entity
     * @throws {PromotionNotFoundError} If promotion not found
     * @throws {ParsingError} If parsing fails
     */
    async execute(
        promotionId: string,
        productCategory?: string,
        productSubcategory?: string
    ): Promise<Promotion> {
        if (!promotionId || typeof promotionId !== 'string') {
            throw new Error('Promotion ID must be a non-empty string');
        }

        return await this.promotionRepository.getPromotionById(
            promotionId,
            productCategory,
            productSubcategory
        );
    }
}
