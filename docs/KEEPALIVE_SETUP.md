# Keep-Alive Setup Guide

This guide explains how to configure the automatic keep-alive service for free hosting tiers.

## Problem

Free hosting services (like Render Free, Heroku Free) put your server to sleep after 15 minutes of inactivity. This causes:
- Cold starts (~15 seconds delay)
- Job interruptions during long-running scraping tasks
- Poor user experience

## Solution

The API integrates with **Uptime Robot** (free monitoring service) to automatically keep the server awake **only when jobs are running**.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Render Amazon Scraper API                  │
│                                                         │
│  Job 1 starts → JobManager.executeJob()                │
│                     ↓                                   │
│              runningJobs = 0 → 1                        │
│                     ↓                                   │
│         keepAliveService.activate()                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ POST /editMonitor (status=1)
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   Uptime Robot                          │
│            Monitor Status: ACTIVE                       │
│                                                         │
│  Every 5 minutes:                                       │
│    → GET https://render-app.com/api/health             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Health check
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Render Amazon Scraper API                  │
│             Server stays awake 💚                       │
│                                                         │
│  Jobs 1, 2, 3... executing...                          │
│                                                         │
│  Last job completes → JobManager.executeJob()          │
│                     ↓                                   │
│              runningJobs = 1 → 0                        │
│                     ↓                                   │
│          keepAliveService.pause()                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ POST /editMonitor (status=0)
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   Uptime Robot                          │
│            Monitor Status: PAUSED                       │
│                                                         │
│  No more pings - server can sleep when idle            │
└─────────────────────────────────────────────────────────┘
```

## Setup Instructions

### Step 1: Create Uptime Robot Account

1. Go to https://uptimerobot.com
2. Click "Sign Up" (100% free, no credit card needed)
3. Verify your email
4. Login to dashboard

### Step 2: Create Monitor

1. Click "Add New Monitor"
2. Fill in details:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: Amazon Scraper Keep-Alive
   URL: https://your-app.onrender.com/api/health
   Monitoring Interval: 5 minutes
   Monitor Timeout: 30 seconds
   Alert When Down: OFF (we don't need alerts)
   ```
3. **IMPORTANT:** Set initial status to **PAUSED**
4. Click "Create Monitor"

### Step 3: Get API Key

1. Click your name → "My Settings"
2. Go to "API Settings" tab
3. Click "Create Main API Key"
4. Copy the key (format: `u123456-abcdef123456...`)

### Step 4: Get Monitor ID

1. Go back to Dashboard
2. Click on your monitor name
3. Look at the URL: `https://uptimerobot.com/dashboard#12345678`
4. The number at the end is your Monitor ID: `12345678`

### Step 5: Configure Environment Variables

Add to your deployment (Render, Railway, etc.):

```env
UPTIME_ROBOT_API_KEY=u123456-abcdef123456...
UPTIME_ROBOT_MONITOR_ID=12345678
```

**Render:**
1. Dashboard → Your Service → Environment
2. Add both variables
3. Save Changes
4. Redeploy if needed

**Local Development (.env):**
```env
# Keep-Alive Service (optional in development)
UPTIME_ROBOT_API_KEY=u123456-abcdef123456...
UPTIME_ROBOT_MONITOR_ID=12345678
```

### Step 6: Verify Setup

1. Deploy your application
2. Check logs for:
   ```
   [Server] Amazon Scraper API is running on port 3000
   ```
3. Trigger a job:
   ```bash
   curl -X POST https://your-app.com/api/products/batch \
     -H "X-API-Key: your-key" \
     -d '{"asins":["B08N5WRWNW"],"category":"Livros"}'
   ```
4. Check logs for keep-alive activation:
   ```
   [UptimeRobot] ✅ Monitor activated - server will stay awake during job execution
   ```
5. Check Uptime Robot dashboard - monitor should show "Up" (green)
6. Wait for job to complete
7. Check logs for pause:
   ```
   [UptimeRobot] ⏸️  Monitor paused - server can sleep when idle
   ```
8. Check Uptime Robot dashboard - monitor should show "Paused"

## Troubleshooting

### Monitor not activating

**Symptom:**
```
[UptimeRobot] API key or Monitor ID not configured. Keep-alive service disabled.
```

**Solution:**
- Check environment variables are set correctly
- Ensure no extra spaces or quotes
- Redeploy application after adding env vars

### API Error

**Symptom:**
```
[UptimeRobot] ❌ Failed to activate monitor: { stat: 'fail', error: { message: 'Invalid API key' } }
```

**Solutions:**
- Verify API key is correct (starts with `u`)
- Check API key has "Main API" permissions
- Generate a new API key if needed

### Monitor ID not found

**Symptom:**
```
[UptimeRobot] ❌ Error activating monitor: Monitor not found
```

**Solutions:**
- Verify Monitor ID is correct (numeric only)
- Check monitor exists in your Uptime Robot account
- Ensure monitor is not deleted

### Monitor not pausing

**Symptom:**
Monitor stays active even after all jobs complete

**Debugging:**
1. Check logs for pause message
2. Verify `runningJobs` count reaches 0
3. Check for zombie jobs: `GET /api/health`

**Solution:**
Manually pause via Uptime Robot dashboard if needed

## Verification Checklist

- [ ] Uptime Robot account created
- [ ] Monitor created with correct URL
- [ ] Monitor initial status is "Paused"
- [ ] API key generated
- [ ] Monitor ID copied
- [ ] Environment variables added
- [ ] Application redeployed
- [ ] Test job triggered
- [ ] Logs show activation message
- [ ] Uptime Robot dashboard shows "Up"
- [ ] Jobs complete successfully
- [ ] Logs show pause message
- [ ] Uptime Robot dashboard shows "Paused"

## Cost

```
Uptime Robot Free Tier:
✅ 50 monitors
✅ 5-minute checks
✅ Unlimited checks
✅ API access
✅ Forever free

Our Usage:
📊 1 monitor
📊 ~288 checks/day (assuming 2h/day active)
📊 ~8,640 checks/month
📊 Well within free limits!

Cost: $0/month forever! 🎉
```

## Advanced Configuration

### Multiple Environments

Use different monitors for staging/production:

```env
# Production
UPTIME_ROBOT_API_KEY=u123456-prod...
UPTIME_ROBOT_MONITOR_ID=11111111

# Staging
UPTIME_ROBOT_API_KEY=u123456-staging...
UPTIME_ROBOT_MONITOR_ID=22222222
```

### Custom Intervals

Free tier only supports 5-minute intervals, which is perfect for preventing 15-minute sleep timeout.

To use 1-minute intervals (paid tier $7/month):
- No code changes needed
- Just configure 1-minute interval in Uptime Robot dashboard

### Disable Keep-Alive

To disable (e.g., on paid hosting that never sleeps):

1. **Option A:** Remove environment variables
   ```
   Delete UPTIME_ROBOT_API_KEY
   Delete UPTIME_ROBOT_MONITOR_ID
   ```

2. **Option B:** Keep vars but pause monitor permanently in Uptime Robot dashboard

## Monitoring

### View Keep-Alive Status

```bash
# Check if monitor is active
GET /api/health

Response:
{
  "status": "ok",
  "jobs": {
    "running": 2,  # If > 0, keep-alive should be active
    "pending": 5,
    ...
  }
}
```

### Uptime Robot Dashboard

Monitor statistics available at:
- Response times
- Uptime percentage
- Recent events
- Response time graph

## FAQ

**Q: Does this work with other hosting providers?**  
A: Yes! Works with any provider that sleeps on inactivity (Render, Heroku, Railway, etc.)

**Q: Can I use a different monitoring service?**  
A: Yes, the interface `IKeepAliveService` allows you to implement other services (Cron-job.org, Pingdom, etc.)

**Q: Does this cost anything?**  
A: No, both Uptime Robot free tier and this feature are 100% free.

**Q: What if Uptime Robot is down?**  
A: API continues working normally, just may experience cold starts.

**Q: Can I test locally?**  
A: Yes, set env vars in `.env` file. Monitor will activate/pause during local development.

**Q: Does this affect paid hosting?**  
A: No, if environment variables are not set, keep-alive is disabled. On always-on hosting, just don't configure it.

## References

- [Uptime Robot API Documentation](https://uptimerobot.com/api/)
- [Render Free Tier Limits](https://render.com/docs/free)
- [Project Architecture Documentation](./API.md)

## Support

If you encounter issues:

1. Check logs for error messages
2. Verify environment variables
3. Test API key with Uptime Robot API directly
4. Open issue on GitHub with logs

---

## API v3 Details

This implementation uses **Uptime Robot API v3**, which offers improved features over v2:

### Key Differences from v2

| Feature | v2 | v3 |
|---------|----|----|
| **Authentication** | `api_key` in form body | HTTP Basic Auth (username=api_key, password="") |
| **HTTP Method** | `POST /editMonitor` | `PATCH /monitors/{id}` |
| **Rate Limits** | Not documented | **10 req/min** (FREE tier) |
| **Rate Limit Headers** | No | ✅ `X-RateLimit-*` headers |
| **Error Handling** | Custom `stat` field | Standard HTTP status codes (429, 401, 404) |

### Rate Limit Headers

v3 provides useful rate limit information in response headers:

```
X-RateLimit-Limit: 10           # Max requests per minute
X-RateLimit-Remaining: 8        # Remaining requests in current window
X-RateLimit-Reset: 1735390800   # Unix timestamp when limit resets
Retry-After: 45                 # Seconds to wait before retrying (on 429 error)
```

### Error Responses

v3 uses standard HTTP status codes:

- **200**: Success
- **401**: Invalid API key
- **404**: Monitor ID not found
- **429**: Rate limit exceeded (10 req/min on FREE tier)

### Rate Limit Considerations

With **10 requests/min** on the FREE tier:

```
activate() + pause() = 2 requests per job cycle
= 5 job cycles per minute maximum
```

Our usage is well within limits:
- **Typical:** 2-3 requests/hour (1 activate + 1-2 pauses)
- **Heavy:** ~20 requests/hour (10 promotions starting/ending)
- **Peak:** Still < 10 req/min

### API Documentation

- **Official Docs:** https://uptimerobot.com/api/v3/
- **Endpoint Used:** `PATCH /monitors/{id}`
- **Authentication:** HTTP Basic Auth

---

**Setup Time:** 5-10 minutes  
**Cost:** $0/month  
**Maintenance:** Zero (automatic)  

🎉 Enjoy cold-start-free experience on free hosting!

