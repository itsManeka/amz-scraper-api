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
        mockedAxios.create.mockReturnValue(mockedAxios as any);
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
            httpClient = new HttpClient();
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
    });
});
