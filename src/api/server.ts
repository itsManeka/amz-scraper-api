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
            storagePath: process.env.STORAGE_PATH || './data',
            cacheTtlMinutes: parseInt(process.env.CACHE_TTL_MINUTES || '30', 10),
            jobTimeoutMinutes: parseInt(process.env.JOB_TIMEOUT_MINUTES || '10', 10),
            // Default to 1 in production to prevent memory issues with Puppeteer
            maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '1', 10),
        };

        const port = parseInt(process.env.PORT || '3000', 10);

        console.log('[Server] Initializing application...');
        console.log('[Server] Configuration:', {
            port,
            storagePath: config.storagePath,
            cacheTtlMinutes: config.cacheTtlMinutes,
            jobTimeoutMinutes: config.jobTimeoutMinutes,
            maxConcurrentJobs: config.maxConcurrentJobs,
        });

        // Create and start the app
        const { app, jobManager } = await createApp(config);

        const server = app.listen(port, () => {
            console.log(`[Server] Amazon Scraper API is running on port ${port}`);
            console.log(`[Server] Health check: http://localhost:${port}/api/health`);
            console.log(`[Server] API root: http://localhost:${port}/`);
        });

        // Graceful shutdown handler
        const gracefulShutdown = async (signal: string) => {
            console.log(`[Server] Received ${signal}, starting graceful shutdown...`);

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
