import { AmazonScraper } from '../src';

/**
 * Example demonstrating how to scrape Amazon Brazil promotion pages
 * Shows both methods: by promotion ID and by URL
 */
async function main() {
    // Initialize the scraper
    const scraper = new AmazonScraper({
        timeout: 30000, // 30 seconds timeout
    });

    console.log('=== Amazon Brazil Promotion Scraper Example ===\n');

    try {
        // Example 1: Get promotion by ID
        console.log('Example 1: Fetching promotion by ID...');
        const promotionId = 'A2P3X1AN29HWHX';
        const promotion = await scraper.getPromotion(promotionId);

        console.log('Promotion ID:', promotion.id);
        console.log('Title:', promotion.description);
        console.log('Details:', promotion.details);
        console.log('Discount Type:', promotion.discountType);
        console.log('Discount Value:', promotion.discountValue);

        // Format dates in Brazil timezone
        if (promotion.startDate) {
            console.log(
                'Start Date:',
                promotion.startDate.toISOString(),
                `(${promotion.startDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })})`
            );
        } else {
            console.log('Start Date: Not available');
        }

        if (promotion.endDate) {
            console.log(
                'End Date:',
                promotion.endDate.toISOString(),
                `(${promotion.endDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })})`
            );
        } else {
            console.log('End Date: Not available');
        }

        console.log('Number of Products:', promotion.asins.length);
        if (promotion.asins.length > 0) {
            console.log('First 5 ASINs:', promotion.asins.slice(0, 5));
        } else {
            console.log('⚠️  No products found in this promotion');
        }
        console.log();

        // Example 1.5: Get promotion with category filter
        console.log('Example 1.5: Fetching promotion with "Livros" category filter...');
        const booksPromotion = await scraper.getPromotion(promotionId, 'Livros');
        console.log('Filtered Promotion:', booksPromotion.description);
        console.log('Number of Products (with filter):', booksPromotion.asins.length);
        console.log();

        // Example 2: Get promotion from URL
        console.log('Example 2: Fetching promotion from URL...');
        const promotionUrl = 'https://www.amazon.com.br/promotion/psp/A2P3X1AN29HWHX';
        const promotionFromUrl = await scraper.getPromotionFromUrl(promotionUrl);

        console.log('Promotion fetched from URL:', promotionFromUrl.description);
        console.log('Total products in promotion:', promotionFromUrl.asins.length);
        console.log();

        // Example 3: Check discount type and calculate savings
        if (promotion.discountType === 'percentage') {
            console.log(`This is a ${promotion.discountValue}% discount promotion`);
        } else {
            console.log(`This is a R$ ${promotion.discountValue} fixed discount promotion`);
        }
        console.log();

        // Example 4: Iterate through products
        console.log('Example 4: Listing all products in the promotion:');
        promotion.asins.forEach((asin, index) => {
            console.log(`  ${index + 1}. ASIN: ${asin}`);
            if (index >= 9) {
                console.log(`  ... and ${promotion.asins.length - 10} more products`);
                return;
            }
        });
        console.log();

    } catch (error) {
        console.error('Error fetching promotion:', error);

        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error name:', error.name);
        }
    }
}

// Run the example
main();

