import { Pool, PoolClient } from 'pg';
import { PostgresStorage } from '../../../infrastructure/storage/PostgresStorage';

// Mock pg
jest.mock('pg', () => {
    const mockPool = {
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
    };
    return { Pool: jest.fn(() => mockPool) };
});

describe('PostgresStorage', () => {
    let storage: PostgresStorage;
    let mockPool: jest.Mocked<Pool>;
    let mockClient: jest.Mocked<PoolClient>;
    const testDatabaseUrl = 'postgresql://user:pass@localhost:5432/testdb';

    beforeEach(() => {
        jest.clearAllMocks();

        // Get the mocked pool instance
        mockPool = new Pool() as jest.Mocked<Pool>;

        // Mock client
        mockClient = {
            query: jest.fn(),
            release: jest.fn(),
        } as unknown as jest.Mocked<PoolClient>;

        (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

        // Set environment variable
        process.env.DATABASE_URL = testDatabaseUrl;
    });

    afterEach(() => {
        delete process.env.DATABASE_URL;
    });

    describe('constructor', () => {
        it('should create instance with database URL from parameter', () => {
            storage = new PostgresStorage(testDatabaseUrl);
            expect(storage).toBeInstanceOf(PostgresStorage);
            expect(Pool).toHaveBeenCalledWith(
                expect.objectContaining({
                    connectionString: testDatabaseUrl,
                    max: 2,
                    idleTimeoutMillis: 10000,
                    connectionTimeoutMillis: 5000,
                })
            );
        });

        it('should create instance with database URL from environment variable', () => {
            storage = new PostgresStorage();
            expect(storage).toBeInstanceOf(PostgresStorage);
        });

        it('should throw error if DATABASE_URL is not provided', () => {
            delete process.env.DATABASE_URL;
            expect(() => new PostgresStorage()).toThrow(
                'DATABASE_URL environment variable is required for PostgresStorage'
            );
        });

        it('should configure SSL for Neon databases', () => {
            const neonUrl = 'postgresql://user:pass@host.neon.tech/db';
            storage = new PostgresStorage(neonUrl);
            expect(Pool).toHaveBeenCalledWith(
                expect.objectContaining({
                    ssl: { rejectUnauthorized: false },
                })
            );
        });

        it('should not configure SSL for non-Neon databases', () => {
            storage = new PostgresStorage(testDatabaseUrl);
            expect(Pool).toHaveBeenCalledWith(
                expect.objectContaining({
                    ssl: undefined,
                })
            );
        });
    });

    describe('initialize', () => {
        beforeEach(() => {
            storage = new PostgresStorage(testDatabaseUrl);
        });

        it('should create storage table and index', async () => {
            (mockClient.query as jest.Mock).mockResolvedValue({});

            await storage.initialize();

            expect(mockPool.connect).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledTimes(2);
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS storage')
            );
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_storage_key_prefix')
            );
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should only initialize once', async () => {
            (mockClient.query as jest.Mock).mockResolvedValue({});

            await storage.initialize();
            await storage.initialize();

            expect(mockPool.connect).toHaveBeenCalledTimes(1);
        });

        it('should throw error if table creation fails', async () => {
            const error = new Error('Permission denied');
            (mockClient.query as jest.Mock).mockRejectedValue(error);

            await expect(storage.initialize()).rejects.toThrow(
                'Failed to initialize PostgreSQL storage: Permission denied'
            );
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should handle non-Error exceptions', async () => {
            (mockClient.query as jest.Mock).mockRejectedValue('String error');

            await expect(storage.initialize()).rejects.toThrow(
                'Failed to initialize PostgreSQL storage: Unknown error'
            );
        });
    });

    describe('save', () => {
        beforeEach(async () => {
            storage = new PostgresStorage(testDatabaseUrl);
            (mockClient.query as jest.Mock).mockResolvedValue({});
            await storage.initialize();
            jest.clearAllMocks();
        });

        it('should insert new data', async () => {
            const testData = { foo: 'bar', count: 42 };
            (mockPool.query as jest.Mock).mockResolvedValue({});

            await storage.save('test:key', testData);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO storage'),
                ['test:key', JSON.stringify(testData)]
            );
        });

        it('should update existing data on conflict', async () => {
            const testData = { updated: true };
            (mockPool.query as jest.Mock).mockResolvedValue({});

            await storage.save('existing:key', testData);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('ON CONFLICT (key)'),
                ['existing:key', JSON.stringify(testData)]
            );
        });

        it('should handle save errors', async () => {
            const error = new Error('Database error');
            (mockPool.query as jest.Mock).mockRejectedValue(error);

            await expect(storage.save('test:key', { data: 'test' })).rejects.toThrow(
                'Failed to save data to storage (key: test:key): Database error'
            );
        });

        it('should handle non-Error exceptions', async () => {
            (mockPool.query as jest.Mock).mockRejectedValue('String error');

            await expect(storage.save('test:key', { data: 'test' })).rejects.toThrow(
                'Failed to save data to storage (key: test:key): Unknown error'
            );
        });
    });

    describe('get', () => {
        beforeEach(async () => {
            storage = new PostgresStorage(testDatabaseUrl);
            (mockClient.query as jest.Mock).mockResolvedValue({});
            await storage.initialize();
            jest.clearAllMocks();
        });

        it('should retrieve existing data', async () => {
            const testData = { foo: 'bar', count: 42 };
            (mockPool.query as jest.Mock).mockResolvedValue({
                rows: [{ value: testData }],
            });

            const result = await storage.get<typeof testData>('test:key');

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT value FROM storage WHERE key = $1',
                ['test:key']
            );
            expect(result).toEqual(testData);
        });

        it('should return null for non-existent key', async () => {
            (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await storage.get('nonexistent:key');

            expect(result).toBeNull();
        });

        it('should handle read errors', async () => {
            const error = new Error('Connection lost');
            (mockPool.query as jest.Mock).mockRejectedValue(error);

            await expect(storage.get('test:key')).rejects.toThrow(
                'Failed to read data from storage (key: test:key): Connection lost'
            );
        });

        it('should handle non-Error exceptions', async () => {
            (mockPool.query as jest.Mock).mockRejectedValue('String error');

            await expect(storage.get('test:key')).rejects.toThrow(
                'Failed to read data from storage (key: test:key): Unknown error'
            );
        });
    });

    describe('delete', () => {
        beforeEach(async () => {
            storage = new PostgresStorage(testDatabaseUrl);
            (mockClient.query as jest.Mock).mockResolvedValue({});
            await storage.initialize();
            jest.clearAllMocks();
        });

        it('should delete data', async () => {
            (mockPool.query as jest.Mock).mockResolvedValue({});

            await storage.delete('test:key');

            expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM storage WHERE key = $1', [
                'test:key',
            ]);
        });

        it('should handle delete errors', async () => {
            const error = new Error('Database error');
            (mockPool.query as jest.Mock).mockRejectedValue(error);

            await expect(storage.delete('test:key')).rejects.toThrow(
                'Failed to delete data from storage (key: test:key): Database error'
            );
        });

        it('should handle non-Error exceptions', async () => {
            (mockPool.query as jest.Mock).mockRejectedValue('String error');

            await expect(storage.delete('test:key')).rejects.toThrow(
                'Failed to delete data from storage (key: test:key): Unknown error'
            );
        });
    });

    describe('exists', () => {
        beforeEach(async () => {
            storage = new PostgresStorage(testDatabaseUrl);
            (mockClient.query as jest.Mock).mockResolvedValue({});
            await storage.initialize();
            jest.clearAllMocks();
        });

        it('should return true for existing key', async () => {
            (mockPool.query as jest.Mock).mockResolvedValue({
                rows: [{ exists: true }],
            });

            const result = await storage.exists('test:key');

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT EXISTS(SELECT 1 FROM storage WHERE key = $1) as exists',
                ['test:key']
            );
            expect(result).toBe(true);
        });

        it('should return false for non-existent key', async () => {
            (mockPool.query as jest.Mock).mockResolvedValue({
                rows: [{ exists: false }],
            });

            const result = await storage.exists('nonexistent:key');

            expect(result).toBe(false);
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            (mockPool.query as jest.Mock).mockRejectedValue(error);

            await expect(storage.exists('test:key')).rejects.toThrow(
                'Failed to check if key exists in storage (key: test:key): Database error'
            );
        });
    });

    describe('listKeys', () => {
        beforeEach(async () => {
            storage = new PostgresStorage(testDatabaseUrl);
            (mockClient.query as jest.Mock).mockResolvedValue({});
            await storage.initialize();
            jest.clearAllMocks();
        });

        it('should list all keys without prefix', async () => {
            (mockPool.query as jest.Mock).mockResolvedValue({
                rows: [{ key: 'key1' }, { key: 'key2' }, { key: 'key3' }],
            });

            const result = await storage.listKeys();

            expect(mockPool.query).toHaveBeenCalledWith('SELECT key FROM storage ORDER BY key', []);
            expect(result).toEqual(['key1', 'key2', 'key3']);
        });

        it('should list keys with prefix', async () => {
            (mockPool.query as jest.Mock).mockResolvedValue({
                rows: [{ key: 'job:1' }, { key: 'job:2' }],
            });

            const result = await storage.listKeys('job:');

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT key FROM storage WHERE key LIKE $1 ORDER BY key',
                ['job:%']
            );
            expect(result).toEqual(['job:1', 'job:2']);
        });

        it('should handle list errors', async () => {
            const error = new Error('Database error');
            (mockPool.query as jest.Mock).mockRejectedValue(error);

            await expect(storage.listKeys()).rejects.toThrow(
                'Failed to list storage keys: Database error'
            );
        });

        it('should handle non-Error exceptions', async () => {
            (mockPool.query as jest.Mock).mockRejectedValue('String error');

            await expect(storage.listKeys()).rejects.toThrow(
                'Failed to list storage keys: Unknown error'
            );
        });
    });

    describe('clear', () => {
        beforeEach(async () => {
            storage = new PostgresStorage(testDatabaseUrl);
            (mockClient.query as jest.Mock).mockResolvedValue({});
            await storage.initialize();
            jest.clearAllMocks();
        });

        it('should clear all data without prefix', async () => {
            (mockPool.query as jest.Mock).mockResolvedValue({});

            await storage.clear();

            expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM storage');
        });

        it('should clear data with prefix', async () => {
            (mockPool.query as jest.Mock).mockResolvedValue({});

            await storage.clear('cache:');

            expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM storage WHERE key LIKE $1', [
                'cache:%',
            ]);
        });

        it('should handle clear errors', async () => {
            const error = new Error('Database error');
            (mockPool.query as jest.Mock).mockRejectedValue(error);

            await expect(storage.clear()).rejects.toThrow(
                'Failed to clear storage: Database error'
            );
        });

        it('should handle non-Error exceptions', async () => {
            (mockPool.query as jest.Mock).mockRejectedValue('String error');

            await expect(storage.clear()).rejects.toThrow('Failed to clear storage: Unknown error');
        });
    });

    describe('close', () => {
        beforeEach(async () => {
            storage = new PostgresStorage(testDatabaseUrl);
            (mockClient.query as jest.Mock).mockResolvedValue({});
            await storage.initialize();
            jest.clearAllMocks();
        });

        it('should close pool connections', async () => {
            (mockPool.end as jest.Mock).mockResolvedValue(undefined);

            await storage.close();

            expect(mockPool.end).toHaveBeenCalled();
        });

        it('should handle close errors gracefully', async () => {
            const error = new Error('Close error');
            (mockPool.end as jest.Mock).mockRejectedValue(error);

            // Should not throw
            await expect(storage.close()).resolves.toBeUndefined();
        });

        it('should handle non-Error exceptions', async () => {
            (mockPool.end as jest.Mock).mockRejectedValue('String error');

            // Should not throw
            await expect(storage.close()).resolves.toBeUndefined();
        });
    });
});
