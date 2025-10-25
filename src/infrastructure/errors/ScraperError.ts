/**
 * Base error class for scraper-related errors
 */
export class ScraperError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ScraperError';
        Object.setPrototypeOf(this, ScraperError.prototype);
    }
}

/**
 * Error thrown when HTTP request fails
 */
export class HttpError extends ScraperError {
    readonly statusCode?: number;

    constructor(message: string, statusCode?: number) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}

/**
 * Error thrown when HTML parsing fails
 */
export class ParsingError extends ScraperError {
    constructor(message: string) {
        super(message);
        this.name = 'ParsingError';
        Object.setPrototypeOf(this, ParsingError.prototype);
    }
}

/**
 * Error thrown when product is not found
 */
export class ProductNotFoundError extends ScraperError {
    readonly asin: string;

    constructor(asin: string) {
        super(`Product with ASIN ${asin} not found`);
        this.name = 'ProductNotFoundError';
        this.asin = asin;
        Object.setPrototypeOf(this, ProductNotFoundError.prototype);
    }
}

/**
 * Error thrown when promotion is not found
 */
export class PromotionNotFoundError extends ScraperError {
    readonly promotionId: string;

    constructor(promotionId: string) {
        super(`Promotion with ID ${promotionId} not found`);
        this.name = 'PromotionNotFoundError';
        this.promotionId = promotionId;
        Object.setPrototypeOf(this, PromotionNotFoundError.prototype);
    }
}
