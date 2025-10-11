# 🏗️ Render.com Deployment Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Render.com Cloud                          │
│                                                                   │
│  ┌─────────────────┐         ┌──────────────────┐               │
│  │   PostgreSQL    │         │   hrms-backend   │               │
│  │   Database      │◄────────┤   (Web Service)  │               │
│  │                 │         │                  │               │
│  │  - hr_system DB │         │  - FastAPI       │               │
│  │  - 256MB (free) │         │  - Python 3.11   │               │
│  │  - Port: 5432   │         │  - Docker        │               │
│  └─────────────────┘         │  - Port: 8000    │               │
│                               └─────────┬────────┘               │
│                                         │                        │
│                                         │ CORS                   │
│                                         │                        │
│                               ┌─────────▼────────┐               │
│                               │  hrms-frontend   │               │
│                               │  (Static Site)   │               │
│                               │                  │               │
│                               │  - React 18      │               │
│                               │  - TypeScript    │               │
│                               │  - Vite          │               │
│                               │  - CDN Served    │               │
│                               └─────────┬────────┘               │
│                                         │                        │
└─────────────────────────────────────────┼────────────────────────┘
                                          │
                                          │ HTTPS
                                          │
                                    ┌─────▼─────┐
                                    │   Users   │
                                    │  (Browser)│
                                    └───────────┘
```

## Service Details

### Backend Service (hrms-backend)
```
┌──────────────────────────────────────┐
│         Web Service (Docker)         │
├──────────────────────────────────────┤
│ URL: hrms-backend.onrender.com      │
│ Runtime: Python 3.11                 │
│ Container: python:3.11-slim          │
│                                      │
│ Endpoints:                           │
│  - GET  /health                      │
│  - GET  /api/v1/docs                 │
│  - POST /api/v1/auth/login           │
│  - GET  /api/v1/employees            │
│  - ... (all API routes)              │
│                                      │
│ Environment:                         │
│  - DATABASE_URL (from PostgreSQL)    │
│  - JWT_SECRET_KEY (auto-generated)   │
│  - SECRET_KEY (auto-generated)       │
│  - ENVIRONMENT=production            │
│  - REDIS_ENABLED=false               │
│  - CORS_ORIGINS=["*"]                │
└──────────────────────────────────────┘
```

### Frontend Service (hrms-frontend)
```
┌──────────────────────────────────────┐
│         Static Site (CDN)            │
├──────────────────────────────────────┤
│ URL: hrms-frontend.onrender.com     │
│ Build: Node.js 18 + Vite             │
│ Output: Static HTML/CSS/JS           │
│                                      │
│ Pages:                               │
│  - /login                            │
│  - /dashboard                        │
│  - /employees                        │
│  - ... (all frontend routes)         │
│                                      │
│ Environment:                         │
│  - VITE_API_BASE_URL                 │
│    (points to backend)               │
└──────────────────────────────────────┘
```

### Database Service (hrms-db)
```
┌──────────────────────────────────────┐
│      PostgreSQL Database             │
├──────────────────────────────────────┤
│ Type: PostgreSQL 15                  │
│ Size: 256MB (free tier)              │
│ Name: hr_system                      │
│ User: hr_user                        │
│                                      │
│ Tables:                              │
│  - organizations                     │
│  - users                             │
│  - employees                         │
│  - departments                       │
│  - attendance                        │
│  - ... (all tables)                  │
│                                      │
│ Connection:                          │
│  Internal URL (automatic)            │
│  Accessible only from backend        │
└──────────────────────────────────────┘
```

## Data Flow

### User Login Flow
```
1. User → Frontend (hrms-frontend.onrender.com)
   └─> GET /login

2. User enters credentials
   └─> POST to /api/v1/auth/login

3. Frontend → Backend (hrms-backend.onrender.com)
   └─> POST /api/v1/auth/login
       Body: { email, password }

4. Backend → Database
   └─> Query: SELECT * FROM users WHERE email = ?

5. Database → Backend
   └─> Return: User record

6. Backend processes
   └─> Validate password
   └─> Generate JWT token

7. Backend → Frontend
   └─> Response: { token, user }

8. Frontend stores token
   └─> localStorage.setItem('token', ...)

9. Frontend redirects
   └─> Navigate to /dashboard
```

### API Request Flow
```
Frontend                Backend               Database
   │                       │                     │
   │ GET /api/v1/employees │                     │
   ├──────────────────────>│                     │
   │ (with JWT token)      │                     │
   │                       │                     │
   │                       │ Verify JWT          │
   │                       ├──────────┐          │
   │                       │          │          │
   │                       │<─────────┘          │
   │                       │                     │
   │                       │ Query employees     │
   │                       ├────────────────────>│
   │                       │                     │
   │                       │ Return data         │
   │                       │<────────────────────┤
   │                       │                     │
   │ JSON response         │                     │
   │<──────────────────────┤                     │
   │                       │                     │
   └─> Render in UI        │                     │
```

## Build Process

### Backend Build
```
1. Render clones repository
   └─> git clone Ashour158/People

2. Navigate to context
   └─> cd python_backend

3. Build Docker image
   └─> docker build -f Dockerfile .
       - Install system dependencies (gcc)
       - Copy requirements.txt
       - Install Python packages
       - Copy application code
       - Create directories (uploads, logs)

4. Start container
   └─> uvicorn app.main:app --host 0.0.0.0 --port $PORT

5. Health check
   └─> GET /health
       - If healthy: Mark service as running
       - If fails: Restart service
```

### Frontend Build
```
1. Render clones repository
   └─> git clone Ashour158/People

2. Navigate to frontend
   └─> cd frontend

3. Install dependencies
   └─> npm ci

4. Build application
   └─> npm run build
       - TypeScript compilation
       - Vite bundling
       - Asset optimization
       - Output to dist/

5. Deploy static files
   └─> Copy dist/ to CDN
       - HTML, CSS, JS files
       - Images and assets
       - Served via HTTPS
```

## Network Configuration

### Ports
- Backend: 8000 (internal), 443 (external HTTPS)
- Frontend: N/A (static files via CDN)
- Database: 5432 (internal only)

### Security
- All traffic over HTTPS (TLS 1.2+)
- Database accessible only from backend
- CORS configured for frontend origin
- JWT tokens for authentication
- Auto-generated secrets

### DNS
```
hrms-backend.onrender.com  → Backend service
hrms-frontend.onrender.com → Static site CDN
```

## Deployment Scenarios

### Scenario 1: Blueprint Deployment (Recommended)
```
render.yaml
    │
    ├─> Creates Backend Service
    │   ├─> Docker build
    │   └─> Environment variables
    │
    ├─> Creates Frontend Service  
    │   ├─> npm build
    │   └─> Static site deploy
    │
    └─> Creates Database
        └─> PostgreSQL instance
```

### Scenario 2: Manual Deployment
```
Step 1: Create Database
    └─> PostgreSQL service
    
Step 2: Create Backend
    └─> Connect to database
    
Step 3: Create Frontend
    └─> Point to backend
```

## Scaling (Future)

### Current (Free Tier)
```
Backend: 1 instance, 0.5 CPU, 512MB RAM
Frontend: CDN (no limit on static files)
Database: 256MB storage
```

### Upgrade Options
```
Backend: Multiple instances, more CPU/RAM
Frontend: Custom domains, advanced features
Database: More storage, backups, HA setup
Redis: Add caching layer
```

## Monitoring

### Health Checks
- Backend: `/health` endpoint every 5 minutes
- Frontend: CDN availability
- Database: Connection monitoring

### Logs
- Backend: Application logs in dashboard
- Frontend: Build logs (no runtime logs)
- Database: Connection and query logs

### Alerts
- Service down: Email notification
- Build failed: Dashboard notification
- Database full: Warning alerts

## Cost (Free Tier)

```
Backend:   $0/month (750 hours free)
Frontend:  $0/month (100GB bandwidth free)
Database:  $0/month (256MB storage free)
Total:     $0/month ✨
```

**Limitations:**
- Services sleep after 15 min inactivity
- 750 hours/month (enough for 1 service)
- Limited build minutes
- No custom domains

## Production Recommendations

For production deployment, consider:

1. **Upgrade to paid tier** ($7/month per service)
2. **Add Redis** for caching and sessions
3. **Enable backups** for database
4. **Custom domain** for branding
5. **CDN optimization** for assets
6. **Monitoring** and alerting tools
7. **Staging environment** for testing

---

This architecture provides a solid foundation for testing the HRMS application before production deployment.
