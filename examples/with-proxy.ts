/**
 * Example demonstrating proxy usage with amz-scraper
 */

import { AmazonScraper } from '../src';

async function main() {
    // Create scraper with proxy configuration
    const scraper = new AmazonScraper({
        timeout: 30000,
        proxy: 'http://proxy.example.com:8080', // Replace with your proxy
        headers: {
            'X-Custom-Header': 'custom-value',
        },
    });

    try {
        const product = await scraper.getProduct('6589737258');

        console.log('Product fetched successfully through proxy!');
        console.log('ASIN:', product.asin);
        console.log('Has Coupon:', product.hasPromoCode());

        if (product.hasPromoCode()) {
            console.log('Coupon Code:', product.promoCode!.name);
        }
    } catch (error) {
        console.error('Failed to fetch product:', error);
    }
}

main();

