import { PromoCode } from './PromoCode';

/**
 * Represents an Amazon product with optional promotional code
 */
export class Product {
    /**
     * The Amazon Standard Identification Number (ASIN)
     */
    readonly asin: string;

    /**
     * The promotional code associated with this product, if any
     */
    readonly promoCode: PromoCode | null;

    /**
     * Creates a new Product instance
     * @param asin - The product ASIN
     * @param promoCode - Optional promotional code
     * @throws {Error} If ASIN is empty or invalid
     */
    constructor(asin: string, promoCode: PromoCode | null = null) {
        if (!asin || asin.trim().length === 0) {
            throw new Error('Product ASIN cannot be empty');
        }
        const trimmed = asin.trim();
        if (!this.isValidAsin(trimmed)) {
            throw new Error(
                `Product ASIN must be 10 alphanumeric characters (received "${asin}" with length ${trimmed.length})`
            );
        }

        this.asin = trimmed;
        this.promoCode = promoCode;
    }

    /**
     * Validates if a string is a valid ASIN format
     * ASINs are typically 10 alphanumeric characters
     * @param asin - The ASIN to validate
     * @returns true if valid, false otherwise
     */
    private isValidAsin(asin: string): boolean {
        // ASIN is 10 alphanumeric characters
        const asinRegex = /^[A-Z0-9]{10}$/i;
        return asinRegex.test(asin);
    }

    /**
     * Checks if the product has a promotional code
     * @returns true if product has a promo code, false otherwise
     */
    hasPromoCode(): boolean {
        return this.promoCode !== null;
    }

    /**
     * Returns a plain object representation of the Product
     */
    toJSON(): { asin: string; promoCode: ReturnType<PromoCode['toJSON']> | null } {
        return {
            asin: this.asin,
            promoCode: this.promoCode ? this.promoCode.toJSON() : null,
        };
    }
}
