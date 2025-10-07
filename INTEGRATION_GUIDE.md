# Complete HR Management System - Integration Guide

## Overview

This guide covers the complete integration of all newly implemented modules:
- Payroll Management
- Performance Review System  
- Recruitment & Onboarding
- Asset Management
- Advanced Reporting & Analytics
- Real-time WebSocket Notifications

## 🗄️ Database Setup

### 1. Run All Schema Files in Order

```bash
# 1. Base schema (organizations, companies, employees, users)
psql hr_system < enhanced_hr_schema.sql

# 2. Attendance and Leave modules
psql hr_system < hr_attendance_leave_schema.sql

# 3. Performance and Recruitment modules
psql hr_system < hr_performance_recruitment.sql

# 4. NEW: Payroll and Asset Management modules
psql hr_system < payroll_asset_management_schema.sql
```

### 2. Verify Database Setup

```sql
-- Check all tables are created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected: 60+ tables including:
-- compensation_components, payroll_runs, payroll_items
-- assets, asset_assignments, asset_maintenance
-- All performance, recruitment, and onboarding tables
```

## 🔧 Backend Setup

### 1. Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # PostgreSQL connection
│   │   ├── redis.ts              # Redis configuration
│   │   └── websocket.ts          # WebSocket configuration
│   ├── middleware/
│   │   ├── auth.ts               # JWT authentication
│   │   ├── validation.ts         # Request validation
│   │   └── errorHandler.ts       # Error handling
│   ├── routes/
│   │   ├── auth.routes.ts        # Authentication routes
│   │   ├── employee.routes.ts    # Employee management
│   │   ├── attendance.routes.ts  # Attendance tracking
│   │   ├── leave.routes.ts       # Leave management
│   │   ├── payroll.routes.ts     # NEW: Payroll management
│   │   ├── performance.routes.ts # NEW: Performance reviews
│   │   ├── recruitment.routes.ts # NEW: Recruitment & hiring
│   │   ├── onboarding.routes.ts  # NEW: Employee onboarding
│   │   ├── assets.routes.ts      # NEW: Asset management
│   │   └── reports.routes.ts     # NEW: Analytics & reports
│   ├── services/
│   │   ├── notification.service.ts # NEW: Notification handling
│   │   ├── email.service.ts       # Email sending
│   │   └── upload.service.ts      # File uploads
│   ├── utils/
│   │   ├── logger.ts             # Winston logger
│   │   └── validators.ts         # Custom validators
│   └── server.ts                 # Main server file
├── package.json
├── tsconfig.json
└── .env
```

### 2. Install Dependencies

```bash
cd backend
npm install express pg redis bcryptjs jsonwebtoken joi winston cors helmet
npm install socket.io date-fns multer
npm install -D typescript @types/node @types/express @types/cors ts-node nodemon
```

### 3. Environment Configuration

Create `backend/.env`:

```env
# Server
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_system
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@yourdomain.com

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# WebSocket
WS_ENABLED=true
```

### 4. Main Server Setup

Create `backend/src/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Pool } from 'pg';
import { setupWebSocket, createNotificationService } from './websocket';

// Import routes
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';
import payrollRoutes from './routes/payroll.routes';
import performanceRoutes from './routes/performance.routes';
import recruitmentRoutes from './routes/recruitment.routes';
import onboardingRoutes from './routes/onboarding.routes';
import assetsRoutes from './routes/assets.routes';
import reportsRoutes from './routes/reports.routes';

const app = express();
const httpServer = createServer(app);

// Database connection
const db = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add database to request
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1', payrollRoutes);
app.use('/api/v1', performanceRoutes);
app.use('/api/v1', recruitmentRoutes);
app.use('/api/v1', onboardingRoutes);
app.use('/api/v1', assetsRoutes);
app.use('/api/v1', reportsRoutes);

// WebSocket setup
if (process.env.WS_ENABLED === 'true') {
  const io = setupWebSocket(httpServer, db);
  const notificationService = createNotificationService(io, db);
  
  // Make notification service available to routes
  app.set('notificationService', notificationService);
}

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ WebSocket server active`);
});
```

### 5. Route Integration

For each new module, create route files that import the implementation:

```typescript
// backend/src/routes/payroll.routes.ts
import { Router } from 'express';
import payrollModule from '../../backend_payroll_module';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken); // Protect all routes
router.use('/', payrollModule);

export default router;
```

## 🎨 Frontend Setup

### 1. Project Structure

```
frontend/
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── service-worker.js        # PWA service worker
│   └── icons/                   # PWA icons
├── src/
│   ├── api/
│   │   ├── axios.ts             # Axios configuration
│   │   ├── websocket.ts         # NEW: WebSocket client
│   │   ├── payroll.api.ts       # NEW: Payroll API
│   │   ├── performance.api.ts   # NEW: Performance API
│   │   ├── recruitment.api.ts   # NEW: Recruitment API
│   │   ├── onboarding.api.ts    # NEW: Onboarding API
│   │   ├── assets.api.ts        # NEW: Assets API
│   │   └── reports.api.ts       # NEW: Reports API
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── common/
│   │   │   ├── DataTable.tsx
│   │   │   └── NotificationBell.tsx  # NEW
│   │   └── charts/
│   │       └── AnalyticsCharts.tsx   # NEW
│   ├── pages/
│   │   ├── payroll/                  # NEW
│   │   │   ├── PayrollDashboard.tsx
│   │   │   ├── PayrollRuns.tsx
│   │   │   └── SalarySlips.tsx
│   │   ├── performance/              # NEW
│   │   │   ├── PerformanceDashboard.tsx
│   │   │   ├── Goals.tsx
│   │   │   └── Reviews.tsx
│   │   ├── recruitment/              # NEW
│   │   │   ├── RecruitmentPipeline.tsx
│   │   │   ├── Candidates.tsx
│   │   │   └── Interviews.tsx
│   │   ├── assets/                   # NEW
│   │   │   ├── AssetManagement.tsx
│   │   │   └── AssetRequests.tsx
│   │   └── reports/                  # NEW
│   │       └── AnalyticsDashboard.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useNotifications.ts       # NEW
│   ├── store/
│   │   ├── authStore.ts
│   │   └── notificationStore.ts      # NEW
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── .env
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install react react-dom react-router-dom
npm install @tanstack/react-query axios zustand
npm install @mui/material @mui/x-data-grid @mui/x-date-pickers @mui/icons-material
npm install @emotion/react @emotion/styled
npm install react-hook-form yup date-fns
npm install recharts react-hot-toast
npm install socket.io-client
npm install -D vite @vitejs/plugin-react typescript
```

### 3. Frontend Environment Configuration

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_WS_URL=http://localhost:5000
```

### 4. Vite Configuration

Create `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'HR Management System',
        short_name: 'HRMS',
        description: 'Complete HR Management Solution',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
```

## 🚀 Running the Application

### Development Mode

```bash
# Terminal 1 - Database
# Make sure PostgreSQL is running

# Terminal 2 - Redis (for caching)
redis-server

# Terminal 3 - Backend
cd backend
npm run dev

# Terminal 4 - Frontend
cd frontend
npm run dev
```

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: hr_system
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./enhanced_hr_schema.sql:/docker-entrypoint-initdb.d/1.sql
      - ./hr_attendance_leave_schema.sql:/docker-entrypoint-initdb.d/2.sql
      - ./hr_performance_recruitment.sql:/docker-entrypoint-initdb.d/3.sql
      - ./payroll_asset_management_schema.sql:/docker-entrypoint-initdb.d/4.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=hr_system
      - DB_USER=postgres
      - DB_PASSWORD=password
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

Run with Docker:

```bash
docker-compose up -d
```

## 📱 PWA Configuration

### 1. Service Worker Registration

Add to `frontend/src/main.tsx`:

```typescript
import { registerSW } from 'virtual:pwa-register';

registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});
```

### 2. Mobile App Installation

Users can install the app on their mobile devices:

1. Open the app in Chrome/Safari on mobile
2. Tap the browser menu
3. Select "Add to Home Screen"
4. The app will behave like a native mobile app

## 🔔 WebSocket Integration

### Backend Integration Example

```typescript
// In any route handler
const notificationService = req.app.get('notificationService');

// Notify user about leave approval
await notificationService.notifyLeaveRequest(
  leaveRequestId, 
  'approved'
);

// Notify entire organization
await notificationService.notifyOrganization(
  organizationId,
  {
    type: 'announcement',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight at 10 PM',
    priority: 'high'
  }
);
```

### Frontend Integration Example

```typescript
// In App.tsx or main component
import { wsService } from './api/websocket';
import { useAuth } from './hooks/useAuth';

function App() {
  const { token } = useAuth();
  
  useEffect(() => {
    if (token) {
      wsService.connect(token);
    }
    
    return () => {
      wsService.disconnect();
    };
  }, [token]);
  
  // Use notifications hook
  const { notifications, unreadCount } = useNotifications();
  
  return (
    // ... app content
  );
}
```

## 📊 Testing the Implementation

### 1. Test Payroll Module

```bash
# Create compensation component
curl -X POST http://localhost:5000/api/v1/compensation/components \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "component_name": "Basic Salary",
    "component_code": "BASIC",
    "component_type": "earning",
    "calculation_type": "fixed"
  }'

# Create payroll run
curl -X POST http://localhost:5000/api/v1/payroll/runs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "run_name": "January 2024",
    "run_code": "JAN2024",
    "period_month": 1,
    "period_year": 2024,
    "pay_period_start_date": "2024-01-01",
    "pay_period_end_date": "2024-01-31"
  }'
```

### 2. Test Performance Module

```bash
# Create goal
curl -X POST http://localhost:5000/api/v1/performance/goals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "uuid",
    "goal_title": "Complete Q1 Objectives",
    "goal_type": "performance",
    "start_date": "2024-01-01",
    "end_date": "2024-03-31"
  }'
```

### 3. Test WebSocket Notifications

Open browser console:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Listen for notifications
socket.on('notification', (data) => {
  console.log('Received notification:', data);
});
```

## 🔒 Security Considerations

1. **JWT Tokens**: Store securely, implement refresh tokens
2. **CORS**: Configure for your domain only
3. **Rate Limiting**: Implement on all API endpoints
4. **Input Validation**: All inputs validated with Joi
5. **SQL Injection**: Use parameterized queries (already implemented)
6. **File Uploads**: Validate file types and sizes
7. **WebSocket**: Authenticate all connections

## 📈 Performance Optimization

1. **Database**:
   - Indexes already created in schemas
   - Use connection pooling
   - Implement query caching with Redis

2. **API**:
   - Implement pagination on all list endpoints
   - Use field selection to reduce payload size
   - Enable gzip compression

3. **Frontend**:
   - Code splitting with React.lazy()
   - Memoize expensive computations
   - Implement virtual scrolling for large lists

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -h localhost -U postgres -d hr_system
```

### WebSocket Connection Issues
```bash
# Check if WebSocket port is accessible
telnet localhost 5000
```

### Frontend Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Additional Resources

- API Documentation: See `api_documentation.md`
- Database Schema: See individual `.sql` files
- Deployment: See `deployment_configs.txt`
- Architecture: See `hr_system_architecture.txt`

## ✅ Verification Checklist

- [ ] All database schemas installed
- [ ] Backend server running on port 5000
- [ ] Frontend running on port 3000
- [ ] WebSocket connections working
- [ ] Can create payroll run
- [ ] Can create performance goal
- [ ] Can post job and track candidates
- [ ] Can manage assets
- [ ] Reports display data
- [ ] Notifications appear in real-time
- [ ] PWA installs on mobile

## 🎉 Success!

Your complete HR Management System is now running with:
- ✅ Payroll Management
- ✅ Performance Reviews
- ✅ Recruitment & Onboarding
- ✅ Asset Management
- ✅ Advanced Analytics
- ✅ Real-time Notifications
- ✅ Mobile PWA Support
