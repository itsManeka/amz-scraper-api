/**
 * Configuration options for HTTP requests
 */
export interface HttpClientConfig {
    /**
     * Request timeout in milliseconds
     */
    timeout?: number;

    /**
     * Proxy URL (e.g., "http://proxy.example.com:8080")
     */
    proxy?: string;

    /**
     * Additional headers to include in the request
     */
    headers?: Record<string, string>;
}

/**
 * Interface for HTTP client operations
 * Abstracts the HTTP communication layer
 */
export interface IHttpClient {
    /**
     * Performs a GET request and returns the response body as a string
     * @param url - The URL to fetch
     * @param config - Optional request configuration
     * @returns Promise resolving to the response body as string
     * @throws {Error} If request fails
     */
    get(url: string, config?: HttpClientConfig): Promise<string>;

    /**
     * Performs a POST request and returns the response
     * @param url - The URL to post to
     * @param data - The data to send
     * @param config - Optional request configuration
     * @returns Promise resolving to the response data
     * @throws {Error} If request fails
     */
    post(url: string, data: Record<string, any> | string, config?: HttpClientConfig): Promise<any>;
}
