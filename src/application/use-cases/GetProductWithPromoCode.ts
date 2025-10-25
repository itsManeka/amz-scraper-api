import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Product } from '../../domain/entities/Product';

/**
 * Use case for retrieving product information with promotional code
 * Encapsulates the business logic for fetching product data
 */
export class GetProductWithPromoCode {
    private repository: IProductRepository;

    /**
     * Creates a new GetProductWithPromoCode use case instance
     * @param repository - Product repository implementation
     */
    constructor(repository: IProductRepository) {
        this.repository = repository;
    }

    /**
     * Executes the use case to retrieve product by ASIN
     * @param asin - The Amazon Standard Identification Number
     * @returns Promise resolving to a Product entity with promotional code if available
     * @throws {Error} If ASIN is invalid or product cannot be fetched
     */
    async execute(asin: string): Promise<Product> {
        if (!asin || asin.trim().length === 0) {
            throw new Error('ASIN is required');
        }

        const product = await this.repository.getProductByAsin(asin.trim());
        return product;
    }
}
