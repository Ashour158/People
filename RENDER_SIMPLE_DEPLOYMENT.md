# 🚀 Simple Render Deployment Guide

## Manual Deployment (Recommended)

Since the automatic render.yaml is causing issues, let's deploy manually:

### Step 1: Deploy Backend

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository: `Ashour158/People`**
4. **Configure the service:**

**Service Settings:**
- **Name:** `hrms-backend`
- **Environment:** `Python 3`
- **Build Command:** `cd python_backend && pip install -r requirements.txt`
- **Start Command:** `cd python_backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Environment Variables:**
```
DATABASE_URL=postgresql://user:pass@host:port/dbname
REDIS_URL=redis://host:port
JWT_SECRET_KEY=your-secret-key-here
SECRET_KEY=your-secret-key-here
ENVIRONMENT=production
CORS_ORIGINS=https://your-frontend-url.onrender.com
```

### Step 2: Deploy Frontend

1. **Click "New +" → "Static Site"**
2. **Connect your GitHub repository: `Ashour158/People`**
3. **Configure the service:**

**Service Settings:**
- **Name:** `hrms-frontend`
- **Build Command:** `cd frontend && npm ci && npm run build`
- **Publish Directory:** `frontend/dist`

**Environment Variables:**
```
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api/v1
```

### Step 3: Add Database (Optional)

1. **Click "New +" → "PostgreSQL"**
2. **Name:** `hrms-db`
3. **Plan:** Free tier
4. **Copy the connection string to your backend environment variables**

## 🔧 Alternative: Use Procfile

If the above doesn't work, try this approach:

1. **Deploy Backend with these settings:**
   - **Root Directory:** `python_backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2. **The Procfile will be automatically detected**

## 📊 Expected Results

- **Backend:** `https://hrms-backend.onrender.com`
- **Frontend:** `https://hrms-frontend.onrender.com`
- **Health Check:** `https://hrms-backend.onrender.com/health`
- **API Docs:** `https://hrms-backend.onrender.com/docs`

## 🎉 Success!

Once deployed, you should see:
- ✅ Backend API responding
- ✅ Frontend loading
- ✅ No build errors
- ✅ Full HRMS functionality
