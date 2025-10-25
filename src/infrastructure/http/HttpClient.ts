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
        this.defaultConfig = config;
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
     * Performs a GET request
     * @param url - The URL to fetch
     * @param config - Optional request-specific configuration
     * @returns Promise resolving to the response body as string
     * @throws {HttpError} If request fails
     */
    async get(url: string, config?: HttpClientConfig): Promise<string> {
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

            const response = await this.axiosInstance.get(url, axiosConfig);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const message = error.response?.statusText || error.message;
                throw new HttpError(`HTTP request failed: ${message}`, statusCode);
            }
            throw new HttpError(`Unexpected error during HTTP request: ${error}`);
        }
    }

    /**
     * Performs a POST request
     * @param url - The URL to post to
     * @param data - The data to send (will be form-encoded if object, sent as-is if string)
     * @param config - Optional request-specific configuration
     * @returns Promise resolving to the response (parsed JSON or string)
     * @throws {HttpError} If request fails
     */
    async post(
        url: string,
        data: Record<string, any> | string,
        config?: HttpClientConfig
    ): Promise<any> {
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
            let postData: string | Record<string, any> = data;
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
