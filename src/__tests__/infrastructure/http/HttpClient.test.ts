import { HttpClient } from '../../../infrastructure/http/HttpClient';
import { HttpError } from '../../../infrastructure/errors/ScraperError';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpClient', () => {
    let httpClient: HttpClient;

    beforeEach(() => {
        jest.clearAllMocks();
        mockedAxios.create.mockReturnValue(
            mockedAxios as unknown as ReturnType<typeof axios.create>
        );
    });

    describe('constructor', () => {
        it('should create instance with default config', () => {
            httpClient = new HttpClient();
            expect(mockedAxios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeout: 30000,
                    headers: expect.objectContaining({
                        'User-Agent': expect.stringContaining('Mozilla'),
                        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    }),
                })
            );
        });

        it('should create instance with custom timeout', () => {
            httpClient = new HttpClient({ timeout: 10000 });
            expect(mockedAxios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeout: 10000,
                })
            );
        });

        it('should create instance with custom headers', () => {
            httpClient = new HttpClient({
                headers: { 'X-Custom-Header': 'test-value' },
            });
            expect(mockedAxios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Custom-Header': 'test-value',
                    }),
                })
            );
        });
    });

    describe('get', () => {
        beforeEach(() => {
            // Disable retries for basic tests
            httpClient = new HttpClient({ retries: 0 });
        });

        it('should successfully fetch HTML content', async () => {
            const mockHtml = '<html><body>Test</body></html>';
            mockedAxios.get.mockResolvedValue({ data: mockHtml });

            const result = await httpClient.get('https://example.com');

            expect(result).toBe(mockHtml);
            expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com', expect.any(Object));
        });

        it('should use custom timeout from method config', async () => {
            const mockHtml = '<html><body>Test</body></html>';
            mockedAxios.get.mockResolvedValue({ data: mockHtml });

            await httpClient.get('https://example.com', { timeout: 5000 });

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://example.com',
                expect.objectContaining({
                    timeout: 5000,
                })
            );
        });

        it('should throw HttpError on network error', async () => {
            const error = new Error('Network error');
            mockedAxios.isAxiosError.mockReturnValue(false);
            mockedAxios.get.mockRejectedValue(error);

            await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpError);
            await expect(httpClient.get('https://example.com')).rejects.toThrow(
                'Unexpected error during HTTP request'
            );
        });

        it('should throw HttpError with status code on HTTP error', async () => {
            const axiosError = {
                isAxiosError: true,
                response: {
                    status: 404,
                    statusText: 'Not Found',
                },
                message: 'Request failed with status code 404',
            };
            mockedAxios.isAxiosError.mockReturnValue(true);
            mockedAxios.get.mockRejectedValue(axiosError);

            await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpError);

            try {
                await httpClient.get('https://example.com');
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                expect((error as HttpError).statusCode).toBe(404);
            }
        });

        it('should handle axios error without response', async () => {
            const axiosError = {
                isAxiosError: true,
                message: 'Network Error',
            };
            mockedAxios.isAxiosError.mockReturnValue(true);
            mockedAxios.get.mockRejectedValue(axiosError);

            await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpError);
            await expect(httpClient.get('https://example.com')).rejects.toThrow('Network Error');
        });

        it('should use custom headers from method config', async () => {
            const mockHtml = '<html><body>Test</body></html>';
            mockedAxios.get.mockResolvedValue({ data: mockHtml });
            mockedAxios.defaults = { headers: { common: {} } } as typeof mockedAxios.defaults;

            await httpClient.get('https://example.com', {
                headers: { 'X-Custom': 'value' },
            });

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://example.com',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Custom': 'value',
                    }),
                })
            );
        });

        it('should configure proxy when provided', async () => {
            const mockHtml = '<html><body>Test</body></html>';
            mockedAxios.get.mockResolvedValue({ data: mockHtml });
            mockedAxios.defaults = { headers: { common: {} } } as typeof mockedAxios.defaults;

            await httpClient.get('https://example.com', {
                proxy: 'http://proxy.example.com:8080',
            });

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://example.com',
                expect.objectContaining({
                    httpsAgent: expect.any(Object),
                    proxy: false,
                })
            );
        });

        it('should throw HttpError when receiving HTML error page (502)', async () => {
            const htmlError = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>502 Bad Gateway</title>
</head>
<body>
    <h1>502 Bad Gateway</h1>
</body>
</html>`;
            mockedAxios.get.mockResolvedValue({ data: htmlError, status: 502, statusText: 'Bad Gateway' });

            await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpError);
            await expect(httpClient.get('https://example.com')).rejects.toThrow(
                'Amazon returned error page (502): 502 Bad Gateway'
            );
        });

        it('should throw HttpError when receiving HTML error page (503)', async () => {
            const htmlError = `<!DOCTYPE html>
<html>
<head>
    <title>Service Unavailable</title>
</head>
<body>
    <p>503 Service Unavailable</p>
</body>
</html>`;
            mockedAxios.get.mockResolvedValue({ data: htmlError, status: 503, statusText: 'Service Unavailable' });

            await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpError);
            await expect(httpClient.get('https://example.com')).rejects.toThrow(
                'Amazon returned error page (503)'
            );
        });

        it('should throw HttpError for 4xx status codes', async () => {
            const mockHtml = '<html><body>Not Found</body></html>';
            mockedAxios.get.mockResolvedValue({ data: mockHtml, status: 404, statusText: 'Not Found' });

            await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpError);
            await expect(httpClient.get('https://example.com')).rejects.toThrow(
                'HTTP request failed with status 404: Not Found'
            );
        });

        it('should extract error from HTML without title tag', async () => {
            const htmlError = `<!DOCTYPE html>
<html>
<body>
    <h1>502 Error</h1>
</body>
</html>`;
            mockedAxios.get.mockResolvedValue({ data: htmlError, status: 502, statusText: 'Bad Gateway' });

            await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpError);
            await expect(httpClient.get('https://example.com')).rejects.toThrow(
                'Server error 502'
            );
        });
    });

    describe('retry mechanism', () => {
        beforeEach(() => {
            httpClient = new HttpClient({ retries: 2, retryDelay: 100 });
            mockedAxios.defaults = { headers: { common: {} } } as typeof mockedAxios.defaults;
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should retry on 502 error and succeed', async () => {
            const mockHtml = '<html><body>Success</body></html>';

            mockedAxios.get
                .mockResolvedValueOnce({ data: '<!DOCTYPE html><html><head><title>502</title></head></html>', status: 502, statusText: 'Bad Gateway' })
                .mockResolvedValueOnce({ data: mockHtml, status: 200, statusText: 'OK' });

            const promise = httpClient.get('https://example.com');

            // Fast-forward time for the retry delay
            await jest.advanceTimersByTimeAsync(200);

            const result = await promise;
            expect(result).toBe(mockHtml);
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        });

        it('should retry on 503 error and succeed', async () => {
            const mockHtml = '<html><body>Success</body></html>';

            mockedAxios.get
                .mockResolvedValueOnce({ data: '<!DOCTYPE html><html><head><title>503</title></head></html>', status: 503, statusText: 'Service Unavailable' })
                .mockResolvedValueOnce({ data: mockHtml, status: 200, statusText: 'OK' });

            const promise = httpClient.get('https://example.com');
            await jest.advanceTimersByTimeAsync(200);

            const result = await promise;
            expect(result).toBe(mockHtml);
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        });

        it('should retry on network error and succeed', async () => {
            const mockHtml = '<html><body>Success</body></html>';
            const networkError = { isAxiosError: true, message: 'Network Error' };

            mockedAxios.isAxiosError.mockReturnValue(true);
            mockedAxios.get
                .mockRejectedValueOnce(networkError)
                .mockResolvedValueOnce({ data: mockHtml, status: 200, statusText: 'OK' });

            const promise = httpClient.get('https://example.com');
            await jest.advanceTimersByTimeAsync(200);

            const result = await promise;
            expect(result).toBe(mockHtml);
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        });

        it('should not retry on 404 error', async () => {
            const mockHtml = '<!DOCTYPE html><html><body>Not Found</body></html>';

            mockedAxios.get.mockResolvedValue({ data: mockHtml, status: 404, statusText: 'Not Found' });

            await expect(httpClient.get('https://example.com')).rejects.toThrow(HttpError);
            expect(mockedAxios.get).toHaveBeenCalledTimes(1); // No retries
        });

        it('should retry on 429 rate limit', async () => {
            const mockHtml = '<html><body>Success</body></html>';
            const rateLimitError = {
                isAxiosError: true,
                response: { status: 429, statusText: 'Too Many Requests' },
                message: 'Rate limit exceeded'
            };

            mockedAxios.isAxiosError.mockReturnValue(true);
            mockedAxios.get
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValueOnce({ data: mockHtml, status: 200, statusText: 'OK' });

            const promise = httpClient.get('https://example.com');
            await jest.advanceTimersByTimeAsync(200);

            const result = await promise;
            expect(result).toBe(mockHtml);
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        });

        it('should use exponential backoff', async () => {
            const htmlError = '<!DOCTYPE html><html><head><title>502</title></head></html>';
            const mockHtml = '<html><body>Success</body></html>';

            httpClient = new HttpClient({ retries: 3, retryDelay: 100 });

            mockedAxios.get
                .mockResolvedValueOnce({ data: htmlError, status: 502, statusText: 'Bad Gateway' })
                .mockResolvedValueOnce({ data: htmlError, status: 502, statusText: 'Bad Gateway' })
                .mockResolvedValueOnce({ data: htmlError, status: 502, statusText: 'Bad Gateway' })
                .mockResolvedValueOnce({ data: mockHtml, status: 200, statusText: 'OK' });

            const promise = httpClient.get('https://example.com');

            // Verify exponential backoff: 100ms, 200ms, 400ms (approximately, with jitter)
            await jest.advanceTimersByTimeAsync(150); // First retry (100ms + jitter)
            await jest.advanceTimersByTimeAsync(250); // Second retry (200ms + jitter)
            await jest.advanceTimersByTimeAsync(500); // Third retry (400ms + jitter)

            const result = await promise;
            expect(result).toBe(mockHtml);
            expect(mockedAxios.get).toHaveBeenCalledTimes(4); // Initial + 3 retries
        });
    });

    describe('post', () => {
        beforeEach(() => {
            httpClient = new HttpClient();
            mockedAxios.defaults = { headers: { common: {} } } as typeof mockedAxios.defaults;
        });

        it('should successfully post data', async () => {
            const mockResponse = { success: true };
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            const result = await httpClient.post('https://example.com/api', {
                key: 'value',
            });

            expect(result).toEqual(mockResponse);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://example.com/api',
                { key: 'value' },
                expect.any(Object)
            );
        });

        it('should post string data as-is', async () => {
            const mockResponse = { success: true };
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            await httpClient.post('https://example.com/api', 'raw string data');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://example.com/api',
                'raw string data',
                expect.any(Object)
            );
        });

        it('should convert object to form-encoded string when Content-Type is form-urlencoded', async () => {
            const mockResponse = { success: true };
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            await httpClient.post(
                'https://example.com/api',
                { username: 'test', password: 'pass123' },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://example.com/api',
                'username=test&password=pass123',
                expect.any(Object)
            );
        });

        it('should handle form-urlencoded with lowercase content-type header', async () => {
            const mockResponse = { success: true };
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            await httpClient.post(
                'https://example.com/api',
                { key: 'value with spaces' },
                {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://example.com/api',
                'key=value%20with%20spaces',
                expect.any(Object)
            );
        });

        it('should use custom timeout from method config', async () => {
            const mockResponse = { success: true };
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            await httpClient.post('https://example.com/api', { key: 'value' }, { timeout: 5000 });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://example.com/api',
                { key: 'value' },
                expect.objectContaining({
                    timeout: 5000,
                })
            );
        });

        it('should configure proxy when provided', async () => {
            const mockResponse = { success: true };
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            await httpClient.post(
                'https://example.com/api',
                { key: 'value' },
                { proxy: 'http://proxy.example.com:8080' }
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://example.com/api',
                { key: 'value' },
                expect.objectContaining({
                    httpsAgent: expect.any(Object),
                    proxy: false,
                })
            );
        });

        it('should throw HttpError on POST failure', async () => {
            const axiosError = {
                isAxiosError: true,
                response: {
                    status: 400,
                    statusText: 'Bad Request',
                },
                message: 'Request failed',
            };
            mockedAxios.isAxiosError.mockReturnValue(true);
            mockedAxios.post.mockRejectedValue(axiosError);

            await expect(
                httpClient.post('https://example.com/api', { key: 'value' })
            ).rejects.toThrow(HttpError);

            try {
                await httpClient.post('https://example.com/api', { key: 'value' });
            } catch (error) {
                expect(error).toBeInstanceOf(HttpError);
                expect((error as HttpError).statusCode).toBe(400);
                expect((error as HttpError).message).toContain('Bad Request');
            }
        });

        it('should throw HttpError on non-axios error', async () => {
            const error = new Error('Unexpected error');
            mockedAxios.isAxiosError.mockReturnValue(false);
            mockedAxios.post.mockRejectedValue(error);

            await expect(
                httpClient.post('https://example.com/api', { key: 'value' })
            ).rejects.toThrow(HttpError);
            await expect(
                httpClient.post('https://example.com/api', { key: 'value' })
            ).rejects.toThrow('Unexpected error during HTTP POST request');
        });

        it('should handle axios error without response', async () => {
            const axiosError = {
                isAxiosError: true,
                message: 'Network Error',
            };
            mockedAxios.isAxiosError.mockReturnValue(true);
            mockedAxios.post.mockRejectedValue(axiosError);

            await expect(
                httpClient.post('https://example.com/api', { key: 'value' })
            ).rejects.toThrow(HttpError);
            await expect(
                httpClient.post('https://example.com/api', { key: 'value' })
            ).rejects.toThrow('Network Error');
        });

        it('should use custom headers from method config', async () => {
            const mockResponse = { success: true };
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            await httpClient.post(
                'https://example.com/api',
                { key: 'value' },
                {
                    headers: { 'X-Custom': 'value' },
                }
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://example.com/api',
                { key: 'value' },
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Custom': 'value',
                    }),
                })
            );
        });
    });
});
