/**
 * Basic usage example for amz-scraper package
 * 
 * This example demonstrates how to:
 * 1. Create a scraper instance
 * 2. Fetch product information
 * 3. Check for promotional codes
 * 4. Handle errors
 */

import { AmazonScraper, ProductNotFoundError, HttpError } from '../src';

async function main() {
    // Create scraper instance with optional configuration
    const scraper = new AmazonScraper({
        timeout: 20000, // 20 seconds timeout
        // proxy: 'http://proxy.example.com:8080', // Uncomment to use proxy
    });

    // Example ASIN from the Reckless Volume 1 product
    const asin = '6589737258';

    try {
        console.log(`Fetching product information for ASIN: ${asin}...`);

        const product = await scraper.getProduct(asin);

        console.log('\nProduct Information:');
        console.log('===================');
        console.log('ASIN:', product.asin);
        console.log('Has Promotional Code:', product.hasPromoCode());

        if (product.hasPromoCode()) {
            console.log('\nPromotional Code Details:');
            console.log('========================');
            console.log('Code:', product.promoCode!.name);
            console.log('URL:', product.promoCode!.url);
            console.log('Promotion ID:', product.promoCode!.promotionId);
        } else {
            console.log('\nNo promotional code available for this product.');
        }

        // Convert to JSON
        console.log('\nJSON Output:');
        console.log('============');
        console.log(JSON.stringify(product.toJSON(), null, 2));

    } catch (error) {
        console.error('\nError occurred:');
        console.error('==============');

        if (error instanceof ProductNotFoundError) {
            console.error(`Product with ASIN ${error.asin} was not found.`);
        } else if (error instanceof HttpError) {
            console.error(`HTTP Error: ${error.message}`);
            if (error.statusCode) {
                console.error(`Status Code: ${error.statusCode}`);
            }
        } else if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        } else {
            console.error('Unknown error:', error);
        }

        process.exit(1);
    }
}

// Run the example
main();

