/**
 * Storage interface for persisting data to disk
 * Provides key-value storage with JSON serialization
 */
export interface IStorage {
    /**
     * Saves data to storage
     * @param key - Storage key
     * @param value - Data to store (will be JSON serialized)
     * @throws {Error} If write fails
     */
    save<T>(key: string, value: T): Promise<void>;

    /**
     * Retrieves data from storage
     * @param key - Storage key
     * @returns Stored data or null if not found
     * @throws {Error} If read fails
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Deletes data from storage
     * @param key - Storage key
     * @throws {Error} If delete fails
     */
    delete(key: string): Promise<void>;

    /**
     * Checks if a key exists in storage
     * @param key - Storage key
     * @returns true if key exists, false otherwise
     */
    exists(key: string): Promise<boolean>;

    /**
     * Lists all keys in storage
     * @param prefix - Optional prefix to filter keys
     * @returns Array of keys
     */
    listKeys(prefix?: string): Promise<string[]>;

    /**
     * Clears all data from storage
     * @param prefix - Optional prefix to clear only matching keys
     */
    clear(prefix?: string): Promise<void>;
}

