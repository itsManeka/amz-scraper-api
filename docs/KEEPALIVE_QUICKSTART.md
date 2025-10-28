# Quick Start: Keep-Alive Setup

## 5-Minute Setup Guide

### 1. Get Your Credentials (2 min)

1. **Uptime Robot Account**: https://uptimerobot.com/signup
2. **Create Monitor**:
   - URL: `https://your-render-app.onrender.com/api/health`
   - Interval: 5 minutes
   - **Status: PAUSED** ⚠️
3. **Get API Key**: Settings → API → Create Main API Key
4. **Get Monitor ID**: Dashboard → Click monitor → Copy ID from URL

### 2. Add to Render (1 min)

```env
UPTIME_ROBOT_API_KEY=u123456-your-key-here
UPTIME_ROBOT_MONITOR_ID=12345678
```

### 3. Test (2 min)

```bash
# Trigger a job
curl -X POST https://your-app.onrender.com/api/products/batch \
  -H "X-API-Key: $YOUR_API_KEY" \
  -d '{"asins":["B08N5WRWNW"],"category":"Livros"}'

# Check logs
# Should see: [UptimeRobot] ✅ Monitor activated
```

## That's It! 🎉

Your server will now:
- ✅ Stay awake during job execution
- ✅ Sleep when idle (save resources)
- ✅ Zero cold starts during jobs

---

**Need Help?** See [KEEPALIVE_SETUP.md](./KEEPALIVE_SETUP.md) for detailed guide.

