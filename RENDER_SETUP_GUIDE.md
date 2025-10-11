# 🚀 Render.com Deployment Setup Guide

This guide provides step-by-step instructions for deploying the HR Management System to Render.com for testing before production deployment.

## Prerequisites

1. A [Render.com](https://render.com) account
2. Repository pushed to GitHub: `Ashour158/People`
3. Access to configure environment variables

## Deployment Methods

### Method 1: Automated Deployment with render.yaml (Recommended)

The repository includes a `render.yaml` configuration file for automated Blueprint deployment.

#### Steps:

1. **Login to Render Dashboard**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Sign in with your GitHub account

2. **Create New Blueprint**
   - Click **"New +"** → **"Blueprint"**
   - Select **"Connect a repository"**
   - Choose repository: `Ashour158/People`
   - Render will automatically detect the `render.yaml` file

3. **Review Services**
   The following services will be created:
   - ✅ **hrms-backend**: Python FastAPI backend
   - ✅ **hrms-frontend**: React static site
   - ✅ **hrms-db**: PostgreSQL database

4. **Configure Environment Variables**
   Most variables are auto-configured, but you may want to update:
   - `CORS_ORIGINS`: Update with your actual frontend URL after deployment
   - `VITE_API_BASE_URL`: Update with your actual backend URL after deployment

5. **Deploy**
   - Click **"Apply"** to start deployment
   - Wait 5-10 minutes for services to deploy
   - Both backend and frontend will be assigned URLs

### Method 2: Manual Deployment

If the Blueprint method doesn't work, deploy services manually:

#### Deploy Backend Manually:

1. **Create Web Service**
   - Go to Render Dashboard
   - Click **"New +"** → **"Web Service"**
   - Connect repository: `Ashour158/People`

2. **Configure Backend Service:**
   ```
   Name: hrms-backend
   Runtime: Docker
   Dockerfile Path: ./python_backend/Dockerfile
   Docker Context: ./python_backend
   Instance Type: Free
   ```

3. **Environment Variables:**
   ```
   DATABASE_URL=<will be set after creating database>
   JWT_SECRET_KEY=<generate a random 32+ character string>
   SECRET_KEY=<generate a random 32+ character string>
   ENVIRONMENT=production
   DEBUG=false
   CORS_ORIGINS=["*"]
   REDIS_ENABLED=false
   PORT=8000
   ```

4. **Create PostgreSQL Database**
   - Click **"New +"** → **"PostgreSQL"**
   - Name: `hrms-db`
   - Plan: Free
   - After creation, copy the **Internal Database URL**
   - Add it to backend's `DATABASE_URL` environment variable

#### Deploy Frontend Manually:

1. **Create Static Site**
   - Click **"New +"** → **"Static Site"**
   - Connect repository: `Ashour158/People`

2. **Configure Frontend Service:**
   ```
   Name: hrms-frontend
   Build Command: cd frontend && npm ci && npm run build
   Publish Directory: frontend/dist
   ```

3. **Environment Variables:**
   ```
   VITE_API_BASE_URL=https://<your-backend-url>.onrender.com/api/v1
   ```
   Replace `<your-backend-url>` with your actual backend service URL.

## Post-Deployment Configuration

### Step 1: Update CORS Origins

After both services are deployed:

1. Note your frontend URL (e.g., `https://hrms-frontend.onrender.com`)
2. Go to backend service settings
3. Update `CORS_ORIGINS` environment variable:
   ```
   CORS_ORIGINS=["https://hrms-frontend.onrender.com","*"]
   ```
4. Save and wait for backend to redeploy

### Step 2: Update Frontend API URL

1. Note your backend URL (e.g., `https://hrms-backend.onrender.com`)
2. Go to frontend service settings
3. Update `VITE_API_BASE_URL`:
   ```
   VITE_API_BASE_URL=https://hrms-backend.onrender.com/api/v1
   ```
4. Save and wait for frontend to rebuild

### Step 3: Verify Deployment

Test the following endpoints:

1. **Backend Health Check:**
   ```
   https://<backend-url>.onrender.com/health
   ```
   Should return: `{"status": "healthy", "version": "v1"}`

2. **Backend API Docs:**
   ```
   https://<backend-url>.onrender.com/api/v1/docs
   ```
   Should show interactive API documentation

3. **Frontend Application:**
   ```
   https://<frontend-url>.onrender.com
   ```
   Should load the login page

## Troubleshooting

### Issue: Backend Service Won't Start

**Solution:**
1. Check Render logs for errors
2. Verify `DATABASE_URL` is set correctly
3. Ensure all required environment variables are present
4. Check that Dockerfile builds successfully

### Issue: Frontend Can't Connect to Backend

**Solution:**
1. Verify `VITE_API_BASE_URL` points to correct backend URL
2. Check `CORS_ORIGINS` includes frontend URL
3. Ensure backend is running (check health endpoint)
4. Open browser console to see actual error messages

### Issue: Database Connection Errors

**Solution:**
1. Verify PostgreSQL database is created and running
2. Check `DATABASE_URL` format: `postgresql://user:pass@host:port/dbname`
3. Ensure database is in same region as backend service (for better performance)

### Issue: Build Fails

**Backend Build Issues:**
- Check `requirements.txt` has all dependencies
- Verify Python version compatibility (3.11)
- Check Dockerfile syntax

**Frontend Build Issues:**
- Verify `package.json` scripts are correct
- Ensure all npm dependencies are listed
- Check for TypeScript compilation errors

## Important Notes

### Free Tier Limitations

Render's free tier has some limitations:
- **Services spin down after 15 minutes of inactivity**
- First request after spin-down will be slow (30-60 seconds)
- Database limited to 256MB
- Build time limited to 15 minutes

### Redis Configuration

The current configuration **disables Redis** (`REDIS_ENABLED=false`) because:
- Free tier doesn't include Redis
- System can work without Redis for testing
- For production, consider upgrading to paid plan with Redis

### Database Initialization

On first deployment, you may need to:
1. Run database migrations manually (if not automated)
2. Create initial admin user
3. Seed test data

Access backend shell via Render dashboard to run these commands.

## Expected URLs

After successful deployment:

- **Backend API:** `https://hrms-backend.onrender.com`
- **Frontend App:** `https://hrms-frontend.onrender.com`
- **API Documentation:** `https://hrms-backend.onrender.com/api/v1/docs`
- **Health Check:** `https://hrms-backend.onrender.com/health`

## Next Steps

1. ✅ Test core functionality (login, dashboard, etc.)
2. ✅ Monitor logs for errors
3. ✅ Set up monitoring/alerts if needed
4. ✅ Document any issues found
5. ✅ Plan production deployment with appropriate tier

## Support

For issues specific to Render deployment:
- Check [Render Documentation](https://render.com/docs)
- Review Render service logs in dashboard
- Check this repository's issues for similar problems

For application-specific issues:
- Review `TROUBLESHOOT_DEPLOYMENT.md`
- Check application logs
- Verify environment configuration
