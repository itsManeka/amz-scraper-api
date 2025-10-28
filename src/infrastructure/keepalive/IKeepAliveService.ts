/**
 * Interface for keep-alive services
 * Used to prevent server from sleeping during job execution
 */
export interface IKeepAliveService {
    /**
     * Activates keep-alive monitoring
     * Should be called when first job starts
     */
    activate(): Promise<void>;

    /**
     * Pauses keep-alive monitoring
     * Should be called when last job completes
     */
    pause(): Promise<void>;

    /**
     * Checks if keep-alive is currently active
     */
    isActive(): boolean;
}
