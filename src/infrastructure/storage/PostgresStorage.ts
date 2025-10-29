import { Pool, PoolConfig } from 'pg';
import { IStorage } from './IStorage';

/**
 * PostgreSQL-based storage implementation using Neon
 * Stores data as key-value pairs with JSONB values
 * Optimized for minimal memory usage with connection pooling
 */
export class PostgresStorage implements IStorage {
    private readonly pool: Pool;
    private initialized: boolean = false;

    /**
     * Creates a new PostgresStorage instance
     * @param databaseUrl - PostgreSQL connection string (from Neon or other provider)
     */
    constructor(databaseUrl?: string) {
        const connectionString = databaseUrl || process.env.DATABASE_URL;

        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required for PostgresStorage');
        }

        // Optimized pool configuration for Render free tier
        const poolConfig: PoolConfig = {
            connectionString,
            max: 2, // Maximum 2 connections for memory efficiency
            idleTimeoutMillis: 10000, // Close idle connections after 10 seconds
            connectionTimeoutMillis: 5000, // 5 second connection timeout
            ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
        };

        this.pool = new Pool(poolConfig);

        // Handle pool errors
        this.pool.on('error', (err: Error) => {
            console.error('[PostgresStorage] Unexpected pool error:', err);
        });
    }

    /**
     * Initializes the database schema
     * Creates the storage table and indexes if they don't exist
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            const client = await this.pool.connect();

            try {
                // Create storage table with JSONB column
                await client.query(`
                    CREATE TABLE IF NOT EXISTS storage (
                        key VARCHAR(500) PRIMARY KEY,
                        value JSONB NOT NULL,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    );
                `);

                // Create index for prefix searches
                await client.query(`
                    CREATE INDEX IF NOT EXISTS idx_storage_key_prefix 
                    ON storage (key text_pattern_ops);
                `);

                this.initialized = true;
                console.log('[PostgresStorage] Database schema initialized successfully');
            } finally {
                client.release();
            }
        } catch (error) {
            throw new Error(
                `Failed to initialize PostgreSQL storage: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Saves data to storage
     */
    async save<T>(key: string, value: T): Promise<void> {
        await this.ensureInitialized();

        try {
            await this.pool.query(
                `INSERT INTO storage (key, value, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (key) 
                 DO UPDATE SET value = $2, updated_at = NOW()`,
                [key, JSON.stringify(value)]
            );
        } catch (error) {
            throw new Error(
                `Failed to save data to storage (key: ${key}): ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Retrieves data from storage
     */
    async get<T>(key: string): Promise<T | null> {
        await this.ensureInitialized();

        try {
            const result = await this.pool.query<{ value: T }>(
                'SELECT value FROM storage WHERE key = $1',
                [key]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0].value;
        } catch (error) {
            throw new Error(
                `Failed to read data from storage (key: ${key}): ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Deletes data from storage
     */
    async delete(key: string): Promise<void> {
        await this.ensureInitialized();

        try {
            await this.pool.query('DELETE FROM storage WHERE key = $1', [key]);
        } catch (error) {
            throw new Error(
                `Failed to delete data from storage (key: ${key}): ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Checks if a key exists in storage
     */
    async exists(key: string): Promise<boolean> {
        await this.ensureInitialized();

        try {
            const result = await this.pool.query<{ exists: boolean }>(
                'SELECT EXISTS(SELECT 1 FROM storage WHERE key = $1) as exists',
                [key]
            );

            return result.rows[0].exists;
        } catch (error) {
            throw new Error(
                `Failed to check if key exists in storage (key: ${key}): ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Lists all keys in storage
     * @param prefix - Optional prefix to filter keys
     */
    async listKeys(prefix?: string): Promise<string[]> {
        await this.ensureInitialized();

        try {
            let query: string;
            let params: string[];

            if (prefix) {
                // Use LIKE with text_pattern_ops index for efficient prefix search
                query = 'SELECT key FROM storage WHERE key LIKE $1 ORDER BY key';
                params = [`${prefix}%`];
            } else {
                query = 'SELECT key FROM storage ORDER BY key';
                params = [];
            }

            const result = await this.pool.query<{ key: string }>(query, params);
            return result.rows.map((row) => row.key);
        } catch (error) {
            throw new Error(
                `Failed to list storage keys: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Clears all data from storage
     * @param prefix - Optional prefix to clear only matching keys
     */
    async clear(prefix?: string): Promise<void> {
        await this.ensureInitialized();

        try {
            if (prefix) {
                await this.pool.query('DELETE FROM storage WHERE key LIKE $1', [`${prefix}%`]);
            } else {
                await this.pool.query('DELETE FROM storage');
            }
        } catch (error) {
            throw new Error(
                `Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Closes all database connections
     * Should be called during graceful shutdown
     */
    async close(): Promise<void> {
        try {
            await this.pool.end();
            console.log('[PostgresStorage] Database connections closed');
        } catch (error) {
            console.error(
                '[PostgresStorage] Error closing connections:',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    /**
     * Ensures the storage is initialized before operations
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }
}
