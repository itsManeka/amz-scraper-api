import express, { Express, Request, Response } from 'express';
import { errorHandler } from './middlewares/errorHandler';
import { createProductRoutes } from './routes/product.routes';
import { createPromotionRoutes } from './routes/promotion.routes';
import { createHealthRoutes } from './routes/health.routes';
import { ProductController } from './controllers/ProductController';
import { PromotionController } from './controllers/PromotionController';
import { HealthController } from './controllers/HealthController';
import { GetProductWithPromoCode } from '../application/use-cases/GetProductWithPromoCode';
import { StartPromotionScraping } from '../application/use-cases/StartPromotionScraping';
import { GetJobStatus } from '../application/use-cases/GetJobStatus';
import { GetCachedPromotion } from '../application/use-cases/GetCachedPromotion';
import { GetJobsByPromotionId } from '../application/use-cases/GetJobsByPromotionId';
import { CleanupPromotionJobs } from '../application/use-cases/CleanupPromotionJobs';
import { ProductRepository } from '../infrastructure/repositories/ProductRepository';
import { BrowserPromotionRepository } from '../infrastructure/repositories/BrowserPromotionRepository';
import { HttpClient } from '../infrastructure/http/HttpClient';
import { AmazonHtmlParser } from '../infrastructure/parsers/AmazonHtmlParser';
import { PostgresStorage } from '../infrastructure/storage/PostgresStorage';
import { HybridCache } from '../infrastructure/cache/HybridCache';
import { JobManager } from '../infrastructure/jobs/JobManager';
import { UptimeRobotService } from '../infrastructure/keepalive/UptimeRobotService';

/**
 * Application configuration
 */
export interface AppConfig {
    cacheTtlMinutes: number;
    jobTimeoutMinutes: number;
    maxConcurrentJobs: number;
}

/**
 * Creates and configures the Express application
 * @param config - Application configuration
 * @returns Express app instance along with jobManager and cache for graceful shutdown
 */
export async function createApp(config: AppConfig): Promise<{
    app: Express;
    jobManager: JobManager;
    cache: HybridCache;
    keepAliveService: UptimeRobotService;
    startPromotionScrapingUseCase: StartPromotionScraping;
}> {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Initialize infrastructure
    const storage = new PostgresStorage();
    await storage.initialize();

    const cache = new HybridCache(config.cacheTtlMinutes * 60, storage);
    await cache.loadFromStorage();

    // Initialize keep-alive service for free hosting tiers
    const keepAliveService = new UptimeRobotService();

    const jobManager = new JobManager(storage, config.maxConcurrentJobs, keepAliveService);
    await jobManager.loadFromStorage();

    // Initialize repositories
    const httpClient = new HttpClient({});
    const htmlParser = new AmazonHtmlParser();
    const productRepository = new ProductRepository(httpClient, htmlParser);
    const promotionRepository = new BrowserPromotionRepository(
        config.jobTimeoutMinutes * 60 * 1000
    );

    // Initialize use cases
    const getProductUseCase = new GetProductWithPromoCode(productRepository);
    const startPromotionScrapingUseCase = new StartPromotionScraping(
        promotionRepository,
        jobManager
    );
    const getJobStatusUseCase = new GetJobStatus(jobManager);
    const getCachedPromotionUseCase = new GetCachedPromotion(cache);
    const getJobsByPromotionIdUseCase = new GetJobsByPromotionId(jobManager);
    const cleanupPromotionJobsUseCase = new CleanupPromotionJobs(jobManager);

    // Initialize controllers
    const productController = new ProductController(
        getProductUseCase,
        startPromotionScrapingUseCase
    );
    const promotionController = new PromotionController(
        startPromotionScrapingUseCase,
        getJobStatusUseCase,
        getCachedPromotionUseCase,
        getJobsByPromotionIdUseCase,
        cleanupPromotionJobsUseCase
    );
    const healthController = new HealthController(jobManager);

    // Routes
    app.use('/api/products', createProductRoutes(productController));
    app.use('/api/promotions', createPromotionRoutes(promotionController));
    app.use('/api/health', createHealthRoutes(healthController));

    // Root endpoint
    app.get('/', (_req: Request, res: Response) => {
        res.json({
            name: 'Amazon Scraper API',
            version: '1.0.0',
            endpoints: {
                health: '/api/health',
                product: '/api/products/:asin',
                promotionScrape: '/api/promotions/scrape',
                promotionJob: '/api/promotions/jobs/:jobId',
                promotionJobsByPromotion: '/api/promotions/jobs/by-promotion/:promotionId',
                promotionCached: '/api/promotions/:promotionId',
            },
        });
    });

    // 404 handler
    app.use((req: Request, res: Response) => {
        res.status(404).json({
            error: {
                message: `Route not found: ${req.method} ${req.path}`,
                type: 'NotFoundError',
                statusCode: 404,
            },
        });
    });

    // Error handler (must be last)
    app.use(errorHandler);

    // Schedule cleanup of old jobs (more aggressive in production)
    const cleanupIntervalMinutes = process.env.NODE_ENV === 'production' ? 10 : 60;
    setInterval(
        async () => {
            try {
                await jobManager.clearCompletedJobs(config.jobTimeoutMinutes);

                // Force garbage collection if available (V8 flag --expose-gc)
                if (global.gc) {
                    global.gc();
                    console.log('[App] Garbage collection triggered');
                }
            } catch (error) {
                console.error('[App] Error clearing completed jobs:', error);
            }
        },
        cleanupIntervalMinutes * 60 * 1000
    );

    return { app, jobManager, cache, keepAliveService, startPromotionScrapingUseCase };
}
