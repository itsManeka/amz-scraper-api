import dotenv from 'dotenv';
import { createApp, AppConfig } from './app';

// Load environment variables
dotenv.config();

/**
 * Server entry point
 */
async function start(): Promise<void> {
    try {
        // Configuration from environment variables
        const config: AppConfig = {
            cacheTtlMinutes: parseInt(process.env.CACHE_TTL_MINUTES || '30', 10),
            jobTimeoutMinutes: parseInt(process.env.JOB_TIMEOUT_MINUTES || '10', 10),
            // Default to 1 in production to prevent memory issues with Puppeteer
            maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '1', 10),
        };

        // Validate required environment variables
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }

        const port = parseInt(process.env.PORT || '3000', 10);

        console.log('[Server] Initializing application...');
        console.log('[Server] Configuration:', {
            port,
            storage: 'PostgreSQL (Neon)',
            cacheTtlMinutes: config.cacheTtlMinutes,
            jobTimeoutMinutes: config.jobTimeoutMinutes,
            maxConcurrentJobs: config.maxConcurrentJobs,
        });

        // Create and start the app
        const { app, jobManager, keepAliveService, startPromotionScrapingUseCase } =
            await createApp(config);

        // CRITICAL: Pause keep-alive on startup (may be active from previous crash)
        // Render does not respect graceful shutdown in case of OOM
        try {
            await keepAliveService.pause();
            console.log('[Server] Keep-alive paused on startup (will activate when jobs start)');
        } catch (error) {
            console.warn('[Server] Error pausing keep-alive on startup:', error);
        }

        // Resume parent jobs that were interrupted by server crash
        try {
            const allJobs = await jobManager.listJobs();
            const parentJobs = allJobs.filter(
                (job) =>
                    !job.metadata?.parentJobId && // Is parent job
                    job.metadata?.subcategories && // Has subcategories persisted
                    (job.isPending() || job.isRunning()) // Not completed
            );

            if (parentJobs.length > 0) {
                console.log(`[Server] Found ${parentJobs.length} parent jobs to resume`);

                for (const parentJob of parentJobs) {
                    console.log(`[Server] Resuming parent job ${parentJob.id.substring(0, 8)}`);
                    await startPromotionScrapingUseCase.resumeParentJob(parentJob.id);
                }

                console.log('[Server] All parent jobs resumed successfully');
            }
        } catch (error) {
            console.error('[Server] Error resuming parent jobs:', error);
        }

        const server = app.listen(port, () => {
            console.log(`[Server] Amazon Scraper API is running on port ${port}`);
            console.log(`[Server] Health check: http://localhost:${port}/api/health`);
            console.log(`[Server] API root: http://localhost:${port}/`);
        });

        // Graceful shutdown handler
        const gracefulShutdown = async (signal: string) => {
            console.log(`[Server] Received ${signal}, starting graceful shutdown...`);

            // Pause keep-alive service (for SIGTERM/SIGINT signals)
            try {
                await keepAliveService.pause();
                console.log('[Server] Keep-alive service paused');
            } catch (error) {
                console.error('[Server] Error pausing keep-alive:', error);
            }

            // Stop accepting new connections
            server.close(() => {
                console.log('[Server] HTTP server closed');
            });

            try {
                // Persist all jobs before shutting down
                console.log('[Server] Persisting all jobs...');
                const allJobs = await jobManager.listJobs();
                console.log(`[Server] Found ${allJobs.length} jobs to persist`);

                // Jobs are already persisted by JobManager, but we log this for visibility
                console.log('[Server] All jobs are persisted');

                // Cache is automatically persisted by HybridCache
                console.log('[Server] All data persisted successfully');

                process.exit(0);
            } catch (error) {
                console.error('[Server] Error during graceful shutdown:', error);
                process.exit(1);
            }
        };

        // Register shutdown handlers
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('[Server] Uncaught exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        // Handle unhandled rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error);
        process.exit(1);
    }
}

// Start the server
start();
