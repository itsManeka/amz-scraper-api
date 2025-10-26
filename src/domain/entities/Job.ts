/**
 * Job status enumeration
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Job progress information
 */
export interface JobProgress {
    productsFound?: number;
    lastUpdate?: Date;
    message?: string;
}

/**
 * Represents an asynchronous job for long-running tasks
 */
export class Job<T = unknown> {
    readonly id: string;
    readonly type: string;
    readonly status: JobStatus;
    readonly createdAt: Date;
    readonly startedAt: Date | null;
    readonly completedAt: Date | null;
    readonly progress: JobProgress | null;
    readonly result: T | null;
    readonly error: string | null;

    constructor(data: {
        id: string;
        type: string;
        status: JobStatus;
        createdAt: Date;
        startedAt?: Date | null;
        completedAt?: Date | null;
        progress?: JobProgress | null;
        result?: T | null;
        error?: string | null;
    }) {
        this.validateData(data);

        this.id = data.id;
        this.type = data.type;
        this.status = data.status;
        this.createdAt = data.createdAt;
        this.startedAt = data.startedAt || null;
        this.completedAt = data.completedAt || null;
        this.progress = data.progress || null;
        this.result = data.result || null;
        this.error = data.error || null;
    }

    private validateData(data: {
        id: string;
        type: string;
        status: JobStatus;
        createdAt: Date;
    }): void {
        if (!data.id || typeof data.id !== 'string') {
            throw new Error('Job ID is required and must be a string');
        }

        if (!data.type || typeof data.type !== 'string') {
            throw new Error('Job type is required and must be a string');
        }

        const validStatuses: JobStatus[] = ['pending', 'running', 'completed', 'failed'];
        if (!validStatuses.includes(data.status)) {
            throw new Error(`Job status must be one of: ${validStatuses.join(', ')}`);
        }

        if (!(data.createdAt instanceof Date)) {
            throw new Error('Job createdAt must be a Date object');
        }
    }

    /**
     * Checks if the job is completed (either successfully or failed)
     */
    isCompleted(): boolean {
        return this.status === 'completed' || this.status === 'failed';
    }

    /**
     * Checks if the job is running
     */
    isRunning(): boolean {
        return this.status === 'running';
    }

    /**
     * Checks if the job is pending
     */
    isPending(): boolean {
        return this.status === 'pending';
    }

    /**
     * Checks if the job failed
     */
    hasFailed(): boolean {
        return this.status === 'failed';
    }

    /**
     * Creates a new job with updated status
     */
    withStatus(status: JobStatus): Job<T> {
        return new Job({
            ...this.toJSON(),
            status,
            startedAt: status === 'running' ? new Date() : this.startedAt,
            completedAt:
                status === 'completed' || status === 'failed' ? new Date() : this.completedAt,
        });
    }

    /**
     * Creates a new job with updated progress
     */
    withProgress(progress: JobProgress): Job<T> {
        return new Job({
            ...this.toJSON(),
            progress: {
                ...progress,
                lastUpdate: new Date(),
            },
        });
    }

    /**
     * Creates a new job with result
     */
    withResult(result: T): Job<T> {
        return new Job({
            ...this.toJSON(),
            status: 'completed',
            result,
            completedAt: new Date(),
        });
    }

    /**
     * Creates a new job with error
     */
    withError(error: string): Job<T> {
        return new Job({
            ...this.toJSON(),
            status: 'failed',
            error,
            completedAt: new Date(),
        });
    }

    /**
     * Returns a plain object representation of the Job
     */
    toJSON(): {
        id: string;
        type: string;
        status: JobStatus;
        createdAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
        progress: JobProgress | null;
        result: T | null;
        error: string | null;
    } {
        return {
            id: this.id,
            type: this.type,
            status: this.status,
            createdAt: this.createdAt,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            progress: this.progress,
            result: this.result,
            error: this.error,
        };
    }
}
