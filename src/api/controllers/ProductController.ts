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
     * @param req.params.asin - Product ASIN
     * @param req.query.category - Optional category filter for promotion scraping
     * @param req.query.subcategory - Optional subcategory filter for promotion scraping
     * @param req.query.maxClicks - Optional max clicks for "Show More" button (default: 10)
     */
    async getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { asin } = req.params;
            const { category, subcategory, maxClicks } = req.query;

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

                    // Create promotion scraping job with filters
                    const scrapeRequest = new ScrapeRequest(
                        promotionId,
                        category ? String(category) : null,
                        subcategory ? String(subcategory) : null,
                        maxClicks ? Number(maxClicks) : undefined
                    );
                    const job = await this.startPromotionScrapingUseCase.execute(scrapeRequest);

                    promotionJob = {
                        jobId: job.id,
                        status: job.status,
                    };

                    console.log(
                        `[ProductController] Started promotion scraping job ${job.id} for promotion ${promotionId}` +
                            (category ? ` with category: ${category}` : '')
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

    /**
     * POST /api/products/batch
     * Retrieves multiple products (max 10) and extracts promo codes
     * Automatically triggers promotion scraping jobs for products with promo codes
     * @param req.body.asins - Array of product ASINs (1-10)
     * @param req.body.category - Optional category filter for promotion scraping
     * @param req.body.subcategory - Optional subcategory filter for promotion scraping
     * @param req.body.maxClicks - Optional max clicks for "Show More" button (default: 10)
     */
    async getProductsBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { asins, category, subcategory, maxClicks } = req.body;

            // Validation (should also be done by middleware)
            if (!Array.isArray(asins)) {
                res.status(400).json({
                    error: {
                        message: 'ASINs must be an array',
                        type: 'ValidationError',
                        statusCode: 400,
                    },
                });
                return;
            }

            if (asins.length === 0 || asins.length > 10) {
                res.status(400).json({
                    error: {
                        message: 'ASINs array must contain between 1 and 10 items',
                        type: 'ValidationError',
                        statusCode: 400,
                    },
                });
                return;
            }

            // Fetch all products concurrently
            const productPromises = asins.map(async (asin: string) => {
                try {
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

                            // Create promotion scraping job with filters
                            const scrapeRequest = new ScrapeRequest(
                                promotionId,
                                category || null,
                                subcategory || null,
                                maxClicks !== undefined ? Number(maxClicks) : undefined
                            );
                            const job =
                                await this.startPromotionScrapingUseCase.execute(scrapeRequest);

                            promotionJob = {
                                jobId: job.id,
                                status: job.status,
                            };

                            console.log(
                                `[ProductController] Batch: Started promotion scraping job ${job.id} for promotion ${promotionId}` +
                                    (category ? ` with category: ${category}` : '')
                            );
                        }
                    }

                    return {
                        product: product.toJSON(),
                        promotionJob,
                        error: null,
                    };
                } catch (error) {
                    // Return error for this specific product but don't fail the entire batch
                    return {
                        product: { asin },
                        promotionJob: null,
                        error: {
                            message: error instanceof Error ? error.message : 'Unknown error',
                            type: error instanceof Error ? error.constructor.name : 'Error',
                        },
                    };
                }
            });

            const results = await Promise.all(productPromises);

            // Return all results
            res.json({
                products: results,
                total: results.length,
                successful: results.filter((r) => !r.error).length,
                failed: results.filter((r) => r.error).length,
            });
        } catch (error) {
            next(error);
        }
    }
}
