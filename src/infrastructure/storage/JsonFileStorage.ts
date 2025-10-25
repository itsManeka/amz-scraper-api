import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorage } from './IStorage';

/**
 * JSON file-based storage implementation
 * Stores data as individual JSON files on disk
 */
export class JsonFileStorage implements IStorage {
    private readonly storagePath: string;

    /**
     * Creates a new JsonFileStorage instance
     * @param storagePath - Directory path for storing files
     */
    constructor(storagePath: string) {
        this.storagePath = storagePath;
    }

    /**
     * Initializes the storage directory
     * Creates the directory if it doesn't exist
     */
    async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.storagePath, { recursive: true });
        } catch (error) {
            throw new Error(
                `Failed to initialize storage directory: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Saves data to storage as JSON file
     */
    async save<T>(key: string, value: T): Promise<void> {
        const filePath = this.getFilePath(key);
        const dirPath = path.dirname(filePath);

        try {
            // Ensure directory exists
            await fs.mkdir(dirPath, { recursive: true });

            // Write JSON file
            const json = JSON.stringify(value, null, 2);
            await fs.writeFile(filePath, json, 'utf-8');
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
        const filePath = this.getFilePath(key);

        try {
            const json = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(json) as T;
        } catch (error) {
            // Return null if file doesn't exist
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw new Error(
                `Failed to read data from storage (key: ${key}): ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Deletes data from storage
     */
    async delete(key: string): Promise<void> {
        const filePath = this.getFilePath(key);

        try {
            await fs.unlink(filePath);
        } catch (error) {
            // Ignore if file doesn't exist
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw new Error(
                    `Failed to delete data from storage (key: ${key}): ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        }
    }

    /**
     * Checks if a key exists in storage
     */
    async exists(key: string): Promise<boolean> {
        const filePath = this.getFilePath(key);

        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Lists all keys in storage
     */
    async listKeys(prefix?: string): Promise<string[]> {
        try {
            const keys: string[] = [];
            await this.scanDirectory(this.storagePath, '', keys);

            if (prefix) {
                return keys.filter((key) => key.startsWith(prefix));
            }

            return keys;
        } catch (error) {
            throw new Error(
                `Failed to list storage keys: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Clears all data from storage
     */
    async clear(prefix?: string): Promise<void> {
        try {
            const keys = await this.listKeys(prefix);
            await Promise.all(keys.map((key) => this.delete(key)));
        } catch (error) {
            throw new Error(
                `Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Converts a storage key to a file path
     * @param key - Storage key
     * @returns File path
     */
    private getFilePath(key: string): string {
        // Replace colons with path separators for better organization
        const relativePath = key.replace(/:/g, path.sep);
        return path.join(this.storagePath, `${relativePath}.json`);
    }

    /**
     * Recursively scans a directory to find all JSON files
     * @param dirPath - Directory to scan
     * @param relativePath - Relative path from storage root
     * @param keys - Array to collect keys
     */
    private async scanDirectory(
        dirPath: string,
        relativePath: string,
        keys: string[]
    ): Promise<void> {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);
                const entryRelativePath = relativePath
                    ? `${relativePath}${path.sep}${entry.name}`
                    : entry.name;

                if (entry.isDirectory()) {
                    await this.scanDirectory(entryPath, entryRelativePath, keys);
                } else if (entry.isFile() && entry.name.endsWith('.json')) {
                    // Convert file path back to storage key
                    const key = entryRelativePath
                        .replace(/\.json$/, '')
                        .split(path.sep)
                        .join(':');
                    keys.push(key);
                }
            }
        } catch (error) {
            // Ignore if directory doesn't exist
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }
    }
}

