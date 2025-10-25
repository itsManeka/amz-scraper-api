/**
 * Represents a promotional code/coupon for an Amazon product
 */
export class PromoCode {
    /**
     * The promotional code name (e.g., "HALLOWEEN20")
     */
    readonly name: string;

    /**
     * The full URL to the promotion page
     */
    readonly url: string;

    /**
     * The promotion ID extracted from the URL
     */
    readonly promotionId: string;

    /**
     * Creates a new PromoCode instance
     * @param name - The coupon code name
     * @param url - The full URL to the promotion
     * @param promotionId - The unique promotion identifier
     * @throws {Error} If any required field is empty or invalid
     */
    constructor(name: string, url: string, promotionId: string) {
        if (!name || name.trim().length === 0) {
            throw new Error('PromoCode name cannot be empty');
        }
        if (!url || url.trim().length === 0) {
            throw new Error('PromoCode url cannot be empty');
        }
        if (!promotionId || promotionId.trim().length === 0) {
            throw new Error('PromoCode promotionId cannot be empty');
        }
        if (!this.isValidUrl(url)) {
            throw new Error('PromoCode url must be a valid URL');
        }

        this.name = name.trim();
        this.url = url.trim();
        this.promotionId = promotionId.trim();
    }

    /**
     * Validates if a string is a valid URL
     * @param url - The URL to validate
     * @returns true if valid, false otherwise
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Returns a plain object representation of the PromoCode
     */
    toJSON(): { name: string; url: string; promotionId: string } {
        return {
            name: this.name,
            url: this.url,
            promotionId: this.promotionId,
        };
    }
}
