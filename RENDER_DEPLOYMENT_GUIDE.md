# 🚀 Render Deployment Guide for HRMS

## Quick Deploy to Render

### Step 1: Prepare Your Repository

1. **Make sure all files are committed:**
```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### Step 2: Deploy Backend to Render

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the backend service:**

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

### Step 3: Deploy Frontend to Render

1. **Click "New +" → "Static Site"**
2. **Connect your GitHub repository**
3. **Configure the frontend service:**

**Service Settings:**
- **Name:** `hrms-frontend`
- **Build Command:** `cd frontend && npm ci && npm run build`
- **Publish Directory:** `frontend/dist`

**Environment Variables:**
```
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api/v1
```

### Step 4: Add Database (Optional)

1. **Click "New +" → "PostgreSQL"**
2. **Name:** `hrms-db`
3. **Plan:** Free tier
4. **Copy the connection string to your backend environment variables**

### Step 5: Test Your Deployment

1. **Backend URL:** `https://hrms-backend.onrender.com`
2. **Frontend URL:** `https://hrms-frontend.onrender.com`
3. **API Health Check:** `https://hrms-backend.onrender.com/health`

## 🔧 Troubleshooting

### Common Issues:

1. **Build Fails:**
   - Check that all dependencies are in `requirements.txt`
   - Verify the build command is correct
   - Check the build logs in Render dashboard

2. **Frontend Can't Connect to Backend:**
   - Make sure `VITE_API_BASE_URL` is set correctly
   - Check CORS settings in backend
   - Verify backend is running

3. **Database Connection Issues:**
   - Check `DATABASE_URL` format
   - Verify database is accessible
   - Check connection string

### Build Commands Reference:

**Backend:**
```bash
cd python_backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Frontend:**
```bash
cd frontend
npm ci
npm run build
```

## 📊 Expected URLs:

- **Backend API:** `https://hrms-backend.onrender.com`
- **Frontend App:** `https://hrms-frontend.onrender.com`
- **API Docs:** `https://hrms-backend.onrender.com/docs`
- **Health Check:** `https://hrms-backend.onrender.com/health`

## 🎉 Success!

Once deployed, you should see:
- ✅ Backend API responding at `/health`
- ✅ Frontend loading at the main URL
- ✅ API documentation at `/docs`
- ✅ No build errors in Render logs
