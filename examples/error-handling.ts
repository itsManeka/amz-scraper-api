/**
 * Example demonstrating comprehensive error handling
 */

import {
    AmazonScraper,
    ProductNotFoundError,
    HttpError,
    ParsingError,
    ScraperError,
} from '../src';

async function fetchProductWithErrorHandling(asin: string) {
    const scraper = new AmazonScraper({ timeout: 15000 });

    try {
        console.log(`Attempting to fetch product: ${asin}`);
        const product = await scraper.getProduct(asin);

        return {
            success: true,
            data: product.toJSON(),
        };
    } catch (error) {
        // Handle specific error types
        if (error instanceof ProductNotFoundError) {
            return {
                success: false,
                error: 'PRODUCT_NOT_FOUND',
                message: `Product ${error.asin} does not exist`,
                details: error.message,
            };
        }

        if (error instanceof HttpError) {
            return {
                success: false,
                error: 'HTTP_ERROR',
                message: 'Failed to fetch product page',
                statusCode: error.statusCode,
                details: error.message,
            };
        }

        if (error instanceof ParsingError) {
            return {
                success: false,
                error: 'PARSING_ERROR',
                message: 'Failed to parse product information',
                details: error.message,
            };
        }

        if (error instanceof ScraperError) {
            return {
                success: false,
                error: 'SCRAPER_ERROR',
                message: 'General scraper error',
                details: error.message,
            };
        }

        // Unknown error
        return {
            success: false,
            error: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred',
            details: String(error),
        };
    }
}

async function main() {
    // Test with valid ASIN
    console.log('Test 1: Valid ASIN');
    console.log('==================');
    const result1 = await fetchProductWithErrorHandling('6589737258');
    console.log(JSON.stringify(result1, null, 2));
    console.log();

    // Test with invalid ASIN format
    console.log('Test 2: Invalid ASIN format');
    console.log('===========================');
    const result2 = await fetchProductWithErrorHandling('123'); // Too short
    console.log(JSON.stringify(result2, null, 2));
    console.log();

    // Test with non-existent ASIN (might work depending on Amazon's response)
    console.log('Test 3: Potentially non-existent ASIN');
    console.log('=====================================');
    const result3 = await fetchProductWithErrorHandling('9999999999');
    console.log(JSON.stringify(result3, null, 2));
}

main();

