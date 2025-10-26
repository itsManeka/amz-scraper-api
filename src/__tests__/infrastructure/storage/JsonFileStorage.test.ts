import * as fs from 'fs/promises';
import * as path from 'path';
import { JsonFileStorage } from '../../../infrastructure/storage/JsonFileStorage';

// Mock fs promises
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('JsonFileStorage', () => {
    let storage: JsonFileStorage;
    const testStoragePath = '/test/storage';

    beforeEach(() => {
        jest.clearAllMocks();
        storage = new JsonFileStorage(testStoragePath);
    });

    describe('constructor', () => {
        it('should create instance with storage path', () => {
            expect(storage).toBeInstanceOf(JsonFileStorage);
        });
    });

    describe('initialize', () => {
        it('should create storage directory', async () => {
            mockedFs.mkdir.mockResolvedValue(undefined);

            await storage.initialize();

            expect(mockedFs.mkdir).toHaveBeenCalledWith(testStoragePath, { recursive: true });
        });

        it('should throw error if directory creation fails', async () => {
            const error = new Error('Permission denied');
            mockedFs.mkdir.mockRejectedValue(error);

            await expect(storage.initialize()).rejects.toThrow(
                'Failed to initialize storage directory: Permission denied'
            );
        });

        it('should handle non-Error exceptions', async () => {
            mockedFs.mkdir.mockRejectedValue('String error');

            await expect(storage.initialize()).rejects.toThrow(
                'Failed to initialize storage directory: Unknown error'
            );
        });
    });

    describe('save', () => {
        it('should save data as JSON file', async () => {
            const key = 'test:key';
            const value = { foo: 'bar', count: 42 };
            mockedFs.mkdir.mockResolvedValue(undefined);
            mockedFs.writeFile.mockResolvedValue(undefined);

            await storage.save(key, value);

            const expectedPath = path.join(testStoragePath, 'test', 'key.json');
            expect(mockedFs.mkdir).toHaveBeenCalledWith(path.dirname(expectedPath), {
                recursive: true,
            });
            expect(mockedFs.writeFile).toHaveBeenCalledWith(
                expectedPath,
                JSON.stringify(value, null, 2),
                'utf-8'
            );
        });

        it('should save data with simple key', async () => {
            const key = 'simplekey';
            const value = { data: 'test' };
            mockedFs.mkdir.mockResolvedValue(undefined);
            mockedFs.writeFile.mockResolvedValue(undefined);

            await storage.save(key, value);

            const expectedPath = path.join(testStoragePath, 'simplekey.json');
            expect(mockedFs.writeFile).toHaveBeenCalledWith(
                expectedPath,
                expect.any(String),
                'utf-8'
            );
        });

        it('should save nested data structure', async () => {
            const key = 'nested:data:structure';
            const value = { nested: { deep: { value: 123 } } };
            mockedFs.mkdir.mockResolvedValue(undefined);
            mockedFs.writeFile.mockResolvedValue(undefined);

            await storage.save(key, value);

            const expectedPath = path.join(testStoragePath, 'nested', 'data', 'structure.json');
            expect(mockedFs.writeFile).toHaveBeenCalledWith(
                expectedPath,
                expect.stringContaining('"nested"'),
                'utf-8'
            );
        });

        it('should throw error if save fails', async () => {
            const error = new Error('Disk full');
            mockedFs.mkdir.mockResolvedValue(undefined);
            mockedFs.writeFile.mockRejectedValue(error);

            await expect(storage.save('key', { data: 'test' })).rejects.toThrow(
                'Failed to save data to storage (key: key): Disk full'
            );
        });

        it('should handle non-Error exceptions in save', async () => {
            mockedFs.mkdir.mockResolvedValue(undefined);
            mockedFs.writeFile.mockRejectedValue('String error');

            await expect(storage.save('key', { data: 'test' })).rejects.toThrow(
                'Failed to save data to storage (key: key): Unknown error'
            );
        });
    });

    describe('get', () => {
        it('should retrieve data from JSON file', async () => {
            const key = 'test:key';
            const value = { foo: 'bar', count: 42 };
            const jsonString = JSON.stringify(value);
            mockedFs.readFile.mockResolvedValue(jsonString);

            const result = await storage.get(key);

            const expectedPath = path.join(testStoragePath, 'test', 'key.json');
            expect(mockedFs.readFile).toHaveBeenCalledWith(expectedPath, 'utf-8');
            expect(result).toEqual(value);
        });

        it('should return null if file does not exist', async () => {
            const error: NodeJS.ErrnoException = new Error('File not found');
            error.code = 'ENOENT';
            mockedFs.readFile.mockRejectedValue(error);

            const result = await storage.get('nonexistent');

            expect(result).toBeNull();
        });

        it('should throw error for other read failures', async () => {
            const error = new Error('Permission denied');
            mockedFs.readFile.mockRejectedValue(error);

            await expect(storage.get('key')).rejects.toThrow(
                'Failed to read data from storage (key: key): Permission denied'
            );
        });

        it('should handle non-Error exceptions in get', async () => {
            mockedFs.readFile.mockRejectedValue('String error');

            await expect(storage.get('key')).rejects.toThrow(
                'Failed to read data from storage (key: key): Unknown error'
            );
        });

        it('should parse complex JSON data', async () => {
            const value = {
                nested: { array: [1, 2, 3], object: { key: 'value' } },
                date: '2024-01-01',
            };
            mockedFs.readFile.mockResolvedValue(JSON.stringify(value));

            const result = await storage.get('complex');

            expect(result).toEqual(value);
        });
    });

    describe('delete', () => {
        it('should delete file from storage', async () => {
            const key = 'test:key';
            mockedFs.unlink.mockResolvedValue(undefined);

            await storage.delete(key);

            const expectedPath = path.join(testStoragePath, 'test', 'key.json');
            expect(mockedFs.unlink).toHaveBeenCalledWith(expectedPath);
        });

        it('should not throw error if file does not exist', async () => {
            const error: NodeJS.ErrnoException = new Error('File not found');
            error.code = 'ENOENT';
            mockedFs.unlink.mockRejectedValue(error);

            await expect(storage.delete('nonexistent')).resolves.not.toThrow();
        });

        it('should throw error for other delete failures', async () => {
            const error = new Error('Permission denied');
            mockedFs.unlink.mockRejectedValue(error);

            await expect(storage.delete('key')).rejects.toThrow(
                'Failed to delete data from storage (key: key): Permission denied'
            );
        });

        it('should handle non-Error exceptions in delete', async () => {
            mockedFs.unlink.mockRejectedValue('String error');

            await expect(storage.delete('key')).rejects.toThrow(
                'Failed to delete data from storage (key: key): Unknown error'
            );
        });
    });

    describe('exists', () => {
        it('should return true if file exists', async () => {
            mockedFs.access.mockResolvedValue(undefined);

            const result = await storage.exists('key');

            expect(result).toBe(true);
            const expectedPath = path.join(testStoragePath, 'key.json');
            expect(mockedFs.access).toHaveBeenCalledWith(expectedPath);
        });

        it('should return false if file does not exist', async () => {
            mockedFs.access.mockRejectedValue(new Error('File not found'));

            const result = await storage.exists('nonexistent');

            expect(result).toBe(false);
        });
    });

    describe('listKeys', () => {
        it('should list all keys in storage', async () => {
            mockedFs.readdir.mockResolvedValue([
                { name: 'file1.json', isDirectory: () => false, isFile: () => true } as any,
                { name: 'file2.json', isDirectory: () => false, isFile: () => true } as any,
            ]);

            const keys = await storage.listKeys();

            expect(keys).toEqual(['file1', 'file2']);
        });

        it('should list keys with prefix filter', async () => {
            mockedFs.readdir.mockResolvedValue([
                { name: 'test1.json', isDirectory: () => false, isFile: () => true } as any,
                { name: 'test2.json', isDirectory: () => false, isFile: () => true } as any,
                { name: 'other.json', isDirectory: () => false, isFile: () => true } as any,
            ]);

            const keys = await storage.listKeys('test');

            expect(keys).toEqual(['test1', 'test2']);
        });

        it('should recursively scan directories', async () => {
            mockedFs.readdir
                .mockResolvedValueOnce([
                    { name: 'dir1', isDirectory: () => true, isFile: () => false } as any,
                    { name: 'file1.json', isDirectory: () => false, isFile: () => true } as any,
                ])
                .mockResolvedValueOnce([
                    { name: 'file2.json', isDirectory: () => false, isFile: () => true } as any,
                ]);

            const keys = await storage.listKeys();

            expect(keys).toContain('file1');
            expect(keys).toContain('dir1:file2');
        });

        it('should ignore non-JSON files', async () => {
            mockedFs.readdir.mockResolvedValue([
                { name: 'file.json', isDirectory: () => false, isFile: () => true } as any,
                { name: 'file.txt', isDirectory: () => false, isFile: () => true } as any,
                { name: 'file', isDirectory: () => false, isFile: () => true } as any,
            ]);

            const keys = await storage.listKeys();

            expect(keys).toEqual(['file']);
        });

        it('should handle directory that does not exist', async () => {
            const error: NodeJS.ErrnoException = new Error('Directory not found');
            error.code = 'ENOENT';
            mockedFs.readdir.mockRejectedValue(error);

            const keys = await storage.listKeys();

            expect(keys).toEqual([]);
        });

        it('should throw error for other list failures', async () => {
            const error = new Error('Permission denied');
            mockedFs.readdir.mockRejectedValue(error);

            await expect(storage.listKeys()).rejects.toThrow(
                'Failed to list storage keys: Permission denied'
            );
        });

        it('should handle non-Error exceptions in listKeys', async () => {
            mockedFs.readdir.mockRejectedValue('String error');

            await expect(storage.listKeys()).rejects.toThrow(
                'Failed to list storage keys: Unknown error'
            );
        });
    });

    describe('clear', () => {
        it('should clear all data from storage', async () => {
            mockedFs.readdir.mockResolvedValue([
                { name: 'file1.json', isDirectory: () => false, isFile: () => true } as any,
                { name: 'file2.json', isDirectory: () => false, isFile: () => true } as any,
            ]);
            mockedFs.unlink.mockResolvedValue(undefined);

            await storage.clear();

            expect(mockedFs.unlink).toHaveBeenCalledTimes(2);
        });

        it('should clear data with prefix', async () => {
            mockedFs.readdir.mockResolvedValue([
                { name: 'test1.json', isDirectory: () => false, isFile: () => true } as any,
                { name: 'test2.json', isDirectory: () => false, isFile: () => true } as any,
                { name: 'other.json', isDirectory: () => false, isFile: () => true } as any,
            ]);
            mockedFs.unlink.mockResolvedValue(undefined);

            await storage.clear('test');

            expect(mockedFs.unlink).toHaveBeenCalledTimes(2);
        });

        it('should throw error if clear fails', async () => {
            const error = new Error('Permission denied');
            mockedFs.readdir.mockRejectedValue(error);

            await expect(storage.clear()).rejects.toThrow(
                'Failed to clear storage: Failed to list storage keys: Permission denied'
            );
        });

        it('should handle non-Error exceptions in clear', async () => {
            mockedFs.readdir.mockRejectedValue('String error');

            await expect(storage.clear()).rejects.toThrow(
                'Failed to clear storage: Failed to list storage keys: Unknown error'
            );
        });
    });
});
