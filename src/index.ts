/**
 * amz-scraper - Amazon Brazil scraper package
 * Extracts product information and promotional codes from Amazon Brazil
 *
 * @packageDocumentation
 */

// Main scraper class
export { AmazonScraper, AmazonScraperConfig } from './presentation/AmazonScraper';

// Domain entities
export { Product } from './domain/entities/Product';
export { PromoCode } from './domain/entities/PromoCode';
export { Promotion } from './domain/entities/Promotion';

// Error classes for error handling
export {
    ScraperError,
    HttpError,
    ParsingError,
    ProductNotFoundError,
    PromotionNotFoundError,
} from './infrastructure/errors/ScraperError';

// HTTP client configuration type
export { HttpClientConfig } from './infrastructure/http/IHttpClient';
