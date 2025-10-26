/**
 * Represents a promotion scraping request
 */
export class ScrapeRequest {
    readonly promotionId: string;
    readonly category: string | null;
    readonly subcategory: string | null;

    constructor(
        promotionId: string,
        category: string | null = null,
        subcategory: string | null = null
    ) {
        this.validateData(promotionId, category, subcategory);

        this.promotionId = promotionId.trim();
        this.category = category ? category.trim() : null;
        this.subcategory = subcategory ? subcategory.trim() : null;
    }

    private validateData(
        promotionId: string,
        category: string | null,
        subcategory: string | null
    ): void {
        if (!promotionId || typeof promotionId !== 'string' || promotionId.trim().length === 0) {
            throw new Error('Promotion ID is required and must be a non-empty string');
        }

        // Validate promotion ID format (alphanumeric)
        if (!/^[A-Z0-9]+$/i.test(promotionId.trim())) {
            throw new Error('Promotion ID must contain only alphanumeric characters');
        }

        if (category !== null && (typeof category !== 'string' || category.trim().length === 0)) {
            throw new Error('Category must be a non-empty string or null');
        }

        if (
            subcategory !== null &&
            (typeof subcategory !== 'string' || subcategory.trim().length === 0)
        ) {
            throw new Error('Subcategory must be a non-empty string or null');
        }

        // Subcategory requires category
        if (subcategory !== null && category === null) {
            throw new Error('Subcategory cannot be specified without a category');
        }
    }

    /**
     * Checks if the request has filters
     */
    hasFilters(): boolean {
        return this.category !== null || this.subcategory !== null;
    }

    /**
     * Returns a cache key for this request
     */
    getCacheKey(): string {
        const parts = ['promotion', this.promotionId];
        if (this.category) {
            parts.push(this.category);
        }
        if (this.subcategory) {
            parts.push(this.subcategory);
        }
        return parts.join(':');
    }

    /**
     * Returns a plain object representation of the ScrapeRequest
     */
    toJSON(): { promotionId: string; category: string | null; subcategory: string | null } {
        return {
            promotionId: this.promotionId,
            category: this.category,
            subcategory: this.subcategory,
        };
    }
}
