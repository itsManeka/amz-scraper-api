import axios from 'axios';
import { UptimeRobotService } from '../../../infrastructure/keepalive/UptimeRobotService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UptimeRobotService', () => {
    let service: UptimeRobotService;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('constructor', () => {
        it('should create instance without configuration', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            service = new UptimeRobotService();

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('API key or Monitor ID not configured')
            );

            consoleWarnSpy.mockRestore();
        });

        it('should create instance with configuration', () => {
            process.env.UPTIME_ROBOT_API_KEY = 'test-api-key';
            process.env.UPTIME_ROBOT_MONITOR_ID = '123456';

            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            service = new UptimeRobotService();

            expect(consoleWarnSpy).not.toHaveBeenCalled();

            consoleWarnSpy.mockRestore();
        });
    });

    describe('activate', () => {
        beforeEach(() => {
            process.env.UPTIME_ROBOT_API_KEY = 'test-api-key';
            process.env.UPTIME_ROBOT_MONITOR_ID = '123456';
            service = new UptimeRobotService();
        });

        it('should activate monitor successfully using API v2', async () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'ok' },
            });

            await service.activate();

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.uptimerobot.com/v2/editMonitor',
                expect.any(URLSearchParams),
                expect.objectContaining({
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 15000,
                })
            );

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Monitor activated')
            );
            expect(service.isActive()).toBe(true);

            consoleLogSpy.mockRestore();
        });

        it('should not activate if already active', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'ok' },
            });

            await service.activate();
            mockedAxios.post.mockClear();

            await service.activate();

            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('should handle activation error', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

            await service.activate();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error activating monitor'),
                'Network error'
            );
            expect(service.isActive()).toBe(false);

            consoleErrorSpy.mockRestore();
        });

        it('should handle API error response', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'fail', error: { message: 'Invalid API key' } },
            });

            await service.activate();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to activate monitor'),
                expect.any(Object)
            );
            expect(service.isActive()).toBe(false);

            consoleErrorSpy.mockRestore();
        });
    });

    describe('pause', () => {
        beforeEach(() => {
            process.env.UPTIME_ROBOT_API_KEY = 'test-api-key';
            process.env.UPTIME_ROBOT_MONITOR_ID = '123456';
            service = new UptimeRobotService();
        });

        it('should pause monitor successfully using API v2', async () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            // First activate
            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'ok' },
            });
            await service.activate();

            // Then pause
            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'ok' },
            });
            await service.pause();

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Monitor paused'));
            expect(service.isActive()).toBe(false);

            consoleLogSpy.mockRestore();
        });

        it('should not pause if not active', async () => {
            await service.pause();

            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('should handle pause error', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            // Activate first
            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'ok' },
            });
            await service.activate();

            // Then fail to pause
            mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
            await service.pause();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error pausing monitor'),
                'Network error'
            );

            consoleErrorSpy.mockRestore();
        });
    });

    describe('isActive', () => {
        beforeEach(() => {
            process.env.UPTIME_ROBOT_API_KEY = 'test-api-key';
            process.env.UPTIME_ROBOT_MONITOR_ID = '123456';
            service = new UptimeRobotService();
        });

        it('should return false initially', () => {
            expect(service.isActive()).toBe(false);
        });

        it('should return true after activation', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'ok' },
            });

            await service.activate();

            expect(service.isActive()).toBe(true);
        });

        it('should return false after pause', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'ok' },
            });
            await service.activate();

            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'ok' },
            });
            await service.pause();

            expect(service.isActive()).toBe(false);
        });
    });

    describe('without configuration', () => {
        beforeEach(() => {
            delete process.env.UPTIME_ROBOT_API_KEY;
            delete process.env.UPTIME_ROBOT_MONITOR_ID;
            service = new UptimeRobotService();
        });

        it('should not activate without configuration', async () => {
            await service.activate();

            expect(mockedAxios.post).not.toHaveBeenCalled();
            expect(service.isActive()).toBe(false);
        });

        it('should not pause without configuration', async () => {
            await service.pause();

            expect(mockedAxios.post).not.toHaveBeenCalled();
        });
    });

    describe('concurrent call prevention', () => {
        beforeEach(() => {
            process.env.UPTIME_ROBOT_API_KEY = 'test-api-key';
            process.env.UPTIME_ROBOT_MONITOR_ID = '123456';
            service = new UptimeRobotService();
        });

        it('should prevent concurrent activation calls', async () => {
            // Mock slow API response
            mockedAxios.post.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => resolve({ data: { stat: 'ok' } }), 100)
                    )
            );

            // Call activate twice simultaneously
            const promise1 = service.activate();
            const promise2 = service.activate();

            await Promise.all([promise1, promise2]);

            // Should only call API once
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should prevent concurrent pause calls', async () => {
            // First activate
            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'ok' },
            });
            await service.activate();

            // Clear previous calls
            mockedAxios.post.mockClear();

            // Mock slow pause response
            mockedAxios.post.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => resolve({ data: { stat: 'ok' } }), 100)
                    )
            );

            // Call pause twice simultaneously
            const promise1 = service.pause();
            const promise2 = service.pause();

            await Promise.all([promise1, promise2]);

            // Should only call API once (for pause, activation was cleared)
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should handle timeout errors gracefully', async () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            const timeoutError = new Error('timeout of 15000ms exceeded');
            mockedAxios.post.mockRejectedValueOnce(timeoutError);

            await service.activate();

            // Should log as warning, not error
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Monitor activation timeout')
            );
            expect(service.isActive()).toBe(false);

            consoleWarnSpy.mockRestore();
        });

        it('should handle pause timeout errors gracefully', async () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            // Activate first
            mockedAxios.post.mockResolvedValueOnce({
                data: { stat: 'ok' },
            });
            await service.activate();

            // Then timeout on pause
            const timeoutError = new Error('timeout of 15000ms exceeded');
            mockedAxios.post.mockRejectedValueOnce(timeoutError);

            await service.pause();

            // Should log as warning
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Monitor pause timeout')
            );

            consoleWarnSpy.mockRestore();
            consoleLogSpy.mockRestore();
        });

        it('should still log regular errors as errors', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const networkError = new Error('ECONNREFUSED');
            mockedAxios.post.mockRejectedValueOnce(networkError);

            await service.activate();

            // Should log as error (not warning)
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error activating monitor'),
                'ECONNREFUSED'
            );

            consoleErrorSpy.mockRestore();
        });
    });
});
