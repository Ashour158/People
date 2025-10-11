# 🚀 Render.com Quick Deploy - HR Management System

## One-Click Deploy Button (Coming Soon)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Ashour158/People)

## Quick Start (3 Steps)

### Option A: Blueprint Deployment (Easiest)

1. **Login to Render:** https://dashboard.render.com
2. **New Blueprint:**
   - Click "New +" → "Blueprint"
   - Connect repository: `Ashour158/People`
   - Click "Apply"
3. **Wait 5-10 minutes** - Done! ✅

### Option B: Manual Deployment

1. **Deploy Backend:**
   ```
   New + → Web Service
   - Runtime: Docker
   - Dockerfile: ./python_backend/Dockerfile
   - Docker Context: ./python_backend
   ```

2. **Deploy Frontend:**
   ```
   New + → Static Site
   - Build: cd frontend && npm ci && npm run build
   - Publish: frontend/dist
   ```

3. **Create Database:**
   ```
   New + → PostgreSQL
   - Name: hrms-db
   - Copy connection string to backend env
   ```

## Required Environment Variables

### Backend (hrms-backend)
```env
DATABASE_URL=<from-postgres-database>
JWT_SECRET_KEY=<auto-generate>
SECRET_KEY=<auto-generate>
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=["*"]
REDIS_ENABLED=false
PORT=8000
```

### Frontend (hrms-frontend)
```env
VITE_API_BASE_URL=https://hrms-backend.onrender.com/api/v1
```

## After Deployment

### Update URLs

1. **Backend CORS:**
   - Get frontend URL from Render
   - Update backend `CORS_ORIGINS` to include it
   - Example: `["https://hrms-frontend.onrender.com","*"]`

2. **Frontend API:**
   - Get backend URL from Render
   - Update frontend `VITE_API_BASE_URL`
   - Example: `https://hrms-backend.onrender.com/api/v1`

### Test Deployment

Visit these URLs (replace with your actual URLs):

- ✅ **Health:** `https://hrms-backend.onrender.com/health`
- ✅ **API Docs:** `https://hrms-backend.onrender.com/api/v1/docs`
- ✅ **Frontend:** `https://hrms-frontend.onrender.com`

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Backend won't start | Check DATABASE_URL is set correctly |
| Frontend shows errors | Verify VITE_API_BASE_URL points to backend |
| CORS errors | Add frontend URL to CORS_ORIGINS |
| Build fails | Check logs in Render dashboard |
| Slow first load | Free tier spins down - wait 30-60s |

## Free Tier Notes

⚠️ **Important Limitations:**
- Services sleep after 15 min inactivity
- Database limited to 256MB
- No Redis on free tier
- Build time: max 15 minutes

These are fine for **testing** but consider paid tier for production.

## Repository Files

All necessary files are included:
- ✅ `render.yaml` - Blueprint configuration
- ✅ `python_backend/Dockerfile` - Backend container
- ✅ `frontend/build.sh` - Frontend build script
- ✅ `RENDER_SETUP_GUIDE.md` - Detailed guide
- ✅ `check-render-ready.sh` - Validation script

## Pre-Deployment Check

Run this before deploying:
```bash
./check-render-ready.sh
```

## Need Help?

1. 📖 Read full guide: `RENDER_SETUP_GUIDE.md`
2. 🔧 Troubleshoot: `TROUBLESHOOT_DEPLOYMENT.md`
3. 📝 Check logs: Render Dashboard → Service → Logs
4. 🐛 Report issues: GitHub Issues

## Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Render account created
- [ ] All files committed
- [ ] Validation script passed
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Database created
- [ ] Environment variables set
- [ ] URLs updated in configs
- [ ] Health check passing
- [ ] Frontend loads successfully
- [ ] Can login to system

---

**Ready to deploy?** Start with `RENDER_SETUP_GUIDE.md` for detailed instructions!
