import axios from 'axios';
import { IKeepAliveService } from './IKeepAliveService';

/**
 * Uptime Robot implementation of keep-alive service
 * Uses Uptime Robot API v2 to activate/pause monitoring
 * This keeps the server awake during job execution on free hosting tiers
 *
 * Note: Uses v2 API as v3 is not available for all free tier accounts
 *
 * @see https://uptimerobot.com/api/
 */
export class UptimeRobotService implements IKeepAliveService {
    private readonly apiKey: string | null;
    private readonly monitorId: string | null;
    private readonly apiUrl = 'https://api.uptimerobot.com/v2';
    private active = false;

    constructor() {
        this.apiKey = process.env.UPTIME_ROBOT_API_KEY || null;
        this.monitorId = process.env.UPTIME_ROBOT_MONITOR_ID || null;

        if (!this.apiKey || !this.monitorId) {
            console.warn(
                '[UptimeRobot] API key or Monitor ID not configured. Keep-alive service disabled.'
            );
            console.warn(
                '[UptimeRobot] Set UPTIME_ROBOT_API_KEY and UPTIME_ROBOT_MONITOR_ID env vars to enable.'
            );
        }
    }

    /**
     * Activates the Uptime Robot monitor
     * Monitor will ping the server every 5 minutes to keep it awake
     */
    async activate(): Promise<void> {
        if (!this.canOperate() || this.active) {
            return;
        }

        try {
            const formData = new URLSearchParams({
                api_key: this.apiKey!,
                id: this.monitorId!,
                status: '1', // 1 = resume (unpause)
            });

            const response = await axios.post(`${this.apiUrl}/editMonitor`, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15000, // Increased to 15s for slow API responses
            });

            if (response.data.stat === 'ok') {
                this.active = true;
                console.log(
                    '[UptimeRobot] ✅ Monitor activated - server will stay awake during job execution'
                );
            } else {
                console.error('[UptimeRobot] ❌ Failed to activate monitor:', response.data);
            }
        } catch (error) {
            console.error(
                '[UptimeRobot] ❌ Error activating monitor:',
                this.getErrorMessage(error)
            );
        }
    }

    /**
     * Pauses the Uptime Robot monitor
     * Monitor will stop pinging, allowing server to sleep if idle
     */
    async pause(): Promise<void> {
        if (!this.canOperate() || !this.active) {
            return;
        }

        try {
            const formData = new URLSearchParams({
                api_key: this.apiKey!,
                id: this.monitorId!,
                status: '0', // 0 = pause
            });

            const response = await axios.post(`${this.apiUrl}/editMonitor`, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15000, // Increased to 15s for slow API responses
            });

            if (response.data.stat === 'ok') {
                this.active = false;
                console.log('[UptimeRobot] ⏸️  Monitor paused - server can sleep when idle');
            } else {
                console.error('[UptimeRobot] ❌ Failed to pause monitor:', response.data);
            }
        } catch (error) {
            console.error('[UptimeRobot] ❌ Error pausing monitor:', this.getErrorMessage(error));
        }
    }

    /**
     * Checks if keep-alive is currently active
     */
    isActive(): boolean {
        return this.active;
    }

    /**
     * Checks if service can operate (has required configuration)
     */
    private canOperate(): boolean {
        return !!(this.apiKey && this.monitorId);
    }

    /**
     * Extracts error message from various error types
     */
    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }
}
