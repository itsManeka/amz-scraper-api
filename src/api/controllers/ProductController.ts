import { Request, Response, NextFunction } from 'express';
import { GetProductWithPromoCode } from '../../application/use-cases/GetProductWithPromoCode';
import { StartPromotionScraping } from '../../application/use-cases/StartPromotionScraping';
import { ScrapeRequest } from '../../domain/entities/ScrapeRequest';

/**
 * Controller for product-related endpoints
 */
export class ProductController {
    constructor(
        private readonly getProductUseCase: GetProductWithPromoCode,
        private readonly startPromotionScrapingUseCase: StartPromotionScraping
    ) {}

    /**
     * GET /api/products/:asin
     * Retrieves product information and extracts promo code
     * If promo code found with promotion URL, automatically triggers promotion scraping job
     */
    async getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { asin } = req.params;

            // Get product with promo code
            const product = await this.getProductUseCase.execute(asin);

            // Check if product has promo code with promotion URL
            let promotionJob = null;

            if (product.hasPromoCode() && product.promoCode?.url) {
                // Extract promotion ID from URL
                const promotionIdMatch = product.promoCode.url.match(
                    /\/promotion\/psp\/([A-Z0-9]+)/
                );

                if (promotionIdMatch) {
                    const promotionId = promotionIdMatch[1];

                    // Create promotion scraping job
                    const scrapeRequest = new ScrapeRequest(promotionId);
                    const job = await this.startPromotionScrapingUseCase.execute(scrapeRequest);

                    promotionJob = {
                        jobId: job.id,
                        status: job.status,
                    };

                    console.log(
                        `[ProductController] Started promotion scraping job ${job.id} for promotion ${promotionId}`
                    );
                }
            }

            // Return product with optional promotion job
            res.json({
                product: product.toJSON(),
                promotionJob,
            });
        } catch (error) {
            next(error);
        }
    }
}
