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
            maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '2', 10),
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
        const app = await createApp(config);

        app.listen(port, () => {
            console.log(`[Server] Amazon Scraper API is running on port ${port}`);
            console.log(`[Server] Health check: http://localhost:${port}/api/health`);
            console.log(`[Server] API root: http://localhost:${port}/`);
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error);
        process.exit(1);
    }
}

// Start the server
start();
