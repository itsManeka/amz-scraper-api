import { Product } from '../entities/Product';

/**
 * Interface for product repository operations
 * Defines the contract for fetching product information
 */
export interface IProductRepository {
    /**
     * Retrieves product information by ASIN
     * @param asin - The Amazon Standard Identification Number
     * @returns Promise resolving to a Product entity
     * @throws {Error} If product cannot be fetched or parsed
     */
    getProductByAsin(asin: string): Promise<Product>;
}
