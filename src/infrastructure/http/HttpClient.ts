import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { IHttpClient, HttpClientConfig } from './IHttpClient';
import { HttpError } from '../errors/ScraperError';

/**
 * Axios-based implementation of HTTP client
 * Supports proxy configuration and custom headers
 */
export class HttpClient implements IHttpClient {
    private axiosInstance: AxiosInstance;
    private defaultConfig: HttpClientConfig;

    /**
     * Creates a new HttpClient instance
     * @param config - Default configuration for all requests
     */
    constructor(config: HttpClientConfig = {}) {
        this.defaultConfig = {
            retries: 3,
            retryDelay: 1000,
            ...config,
        };
        this.axiosInstance = axios.create({
            timeout: config.timeout || 30000,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                Connection: 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                ...config.headers,
            },
        });
    }

    /**
     * Determines if an error should be retried
     * @param error - The error to check
     * @param attempt - Current attempt number
     * @returns true if the error should be retried
     */
    private shouldRetry(error: unknown, attempt: number, maxRetries: number): boolean {
        if (attempt >= maxRetries) {
            return false;
        }

        // Retry on network errors
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;

            // Retry on 5xx server errors
            if (status && status >= 500 && status < 600) {
                return true;
            }

            // Retry on network errors (no response)
            if (!error.response) {
                return true;
            }

            // Retry on 429 (rate limit)
            if (status === 429) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calculates delay before next retry using exponential backoff with jitter
     * @param attempt - Current attempt number (0-based)
     * @param baseDelay - Base delay in milliseconds
     * @returns Delay in milliseconds
     */
    private calculateRetryDelay(attempt: number, baseDelay: number): number {
        // Exponential backoff: baseDelay * 2^attempt
        const exponentialDelay = baseDelay * Math.pow(2, attempt);

        // Add jitter (random value between 0 and 25% of delay)
        const jitter = Math.random() * exponentialDelay * 0.25;

        return exponentialDelay + jitter;
    }

    /**
     * Sleeps for specified milliseconds
     * @param ms - Milliseconds to sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Performs a GET request
     * @param url - The URL to fetch
     * @param config - Optional request-specific configuration
     * @returns Promise resolving to the response body as string
     * @throws {HttpError} If request fails
     */
    async get(url: string, config?: HttpClientConfig): Promise<string> {
        const mergedConfig = { ...this.defaultConfig, ...config };
        const maxRetries = mergedConfig.retries ?? 3;
        const retryDelay = mergedConfig.retryDelay ?? 1000;

        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const axiosConfig: AxiosRequestConfig = {
                    timeout: mergedConfig.timeout || this.defaultConfig.timeout || 30000,
                    headers: {
                        ...this.axiosInstance.defaults.headers.common,
                        ...mergedConfig.headers,
                    },
                    validateStatus: (status) => status < 600, // Accept all status codes < 600
                };

                // Configure proxy if provided
                if (mergedConfig.proxy) {
                    const httpsAgent = new HttpsProxyAgent(mergedConfig.proxy);
                    axiosConfig.httpsAgent = httpsAgent;
                    axiosConfig.proxy = false; // Disable axios built-in proxy handling
                }

                const response = await this.axiosInstance.get(url, axiosConfig);

                // Check for error status codes (5xx, 4xx)
                if (response.status >= 400) {
                    // Check if we received HTML when we expected product page
                    const isHtmlError =
                        typeof response.data === 'string' &&
                        response.data.trim().startsWith('<!DOCTYPE') &&
                        response.data.includes('</html>');

                    if (isHtmlError) {
                        const errorMessage = this.extractErrorFromHtml(response.data);
                        const error = new HttpError(
                            `Amazon returned error page (${response.status}): ${errorMessage}`,
                            response.status
                        );

                        // Check if we should retry
                        if (this.shouldRetry(error, attempt, maxRetries) && response.status >= 500) {
                            lastError = error;
                            const delay = this.calculateRetryDelay(attempt, retryDelay);
                            console.log(
                                `[HttpClient] Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms for ${url} (status: ${response.status})`
                            );
                            await this.sleep(delay);
                            continue; // Retry
                        }

                        throw error;
                    }

                    throw new HttpError(
                        `HTTP request failed with status ${response.status}: ${response.statusText}`,
                        response.status
                    );
                }

                return response.data;
            } catch (error) {
                if (error instanceof HttpError && error.statusCode && error.statusCode < 500) {
                    // Don't retry 4xx errors (client errors)
                    throw error;
                }

                // Check if we should retry
                if (this.shouldRetry(error, attempt, maxRetries)) {
                    lastError = error as Error;
                    const delay = this.calculateRetryDelay(attempt, retryDelay);

                    const statusCode = axios.isAxiosError(error) ? error.response?.status : 'unknown';
                    console.log(
                        `[HttpClient] Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms for ${url} (error: ${statusCode})`
                    );

                    await this.sleep(delay);
                    continue; // Retry
                }

                // No more retries, throw the error
                if (error instanceof HttpError) {
                    throw error;
                }

                if (axios.isAxiosError(error)) {
                    const statusCode = error.response?.status;
                    const message = error.response?.statusText || error.message;

                    // Log detailed error for debugging
                    console.error('[HttpClient] Request failed:', {
                        url,
                        statusCode,
                        message,
                        error: error.message,
                    });

                    throw new HttpError(`HTTP request failed: ${message}`, statusCode);
                }

                throw new HttpError(`Unexpected error during HTTP request: ${error}`);
            }
        }

        // Should never reach here, but TypeScript needs it
        throw lastError || new HttpError('Request failed after all retries');
    }

    /**
     * Extracts a readable error message from HTML error pages
     * @param html - HTML content
     * @returns Extracted error message or default message
     */
    private extractErrorFromHtml(html: string): string {
        // Try to extract title or common error patterns
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            return titleMatch[1].trim();
        }

        // Look for common error codes in the HTML
        const errorCodeMatch = html.match(/\b(502|503|504|500)\b/);
        if (errorCodeMatch) {
            return `Server error ${errorCodeMatch[1]}`;
        }

        return 'Unknown server error (HTML error page received)';
    }

    /**
     * Performs a POST request
     * @param url - The URL to post to
     * @param data - The data to send (will be form-encoded if object, sent as-is if string)
     * @param config - Optional request-specific configuration
     * @returns Promise resolving to the response (parsed JSON or string)
     * @throws {HttpError} If request fails
     */
    async post<TResponse = unknown>(
        url: string,
        data: Record<string, unknown> | string,
        config?: HttpClientConfig
    ): Promise<TResponse> {
        try {
            const mergedConfig = { ...this.defaultConfig, ...config };
            const axiosConfig: AxiosRequestConfig = {
                timeout: mergedConfig.timeout || this.defaultConfig.timeout || 30000,
                headers: {
                    ...this.axiosInstance.defaults.headers.common,
                    ...mergedConfig.headers,
                },
            };

            // Configure proxy if provided
            if (mergedConfig.proxy) {
                const httpsAgent = new HttpsProxyAgent(mergedConfig.proxy);
                axiosConfig.httpsAgent = httpsAgent;
                axiosConfig.proxy = false; // Disable axios built-in proxy handling
            }

            // Handle form-encoded data
            let postData: string | Record<string, unknown> = data;
            if (typeof data === 'object' && data !== null) {
                // Check if Content-Type is form-urlencoded
                const contentType =
                    axiosConfig.headers?.['Content-Type'] || axiosConfig.headers?.['content-type'];
                if (contentType?.includes('application/x-www-form-urlencoded')) {
                    // Convert object to URL-encoded string
                    postData = Object.entries(data)
                        .map(
                            ([key, value]) =>
                                `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
                        )
                        .join('&');
                }
            }

            const response = await this.axiosInstance.post(url, postData, axiosConfig);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const message = error.response?.statusText || error.message;
                throw new HttpError(`HTTP POST request failed: ${message}`, statusCode);
            }
            throw new HttpError(`Unexpected error during HTTP POST request: ${error}`);
        }
    }
}
