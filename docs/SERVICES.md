# Infrastructure Services Documentation

This document describes the four core infrastructure services that power the HR Management System.

## Overview

The system requires these infrastructure services to operate:

1. **Email Service** - Handles all email communications
2. **Notification Service** - Manages real-time and persistent notifications via WebSocket
3. **Upload Service** - Manages file uploads and storage
4. **Cache Service** - Provides Redis-based caching

## 1. Email Service

### Location
`backend/src/services/email.service.ts`

### Purpose
Handles all email sending operations including welcome emails, password resets, and leave notifications.

### Features
- Welcome emails for new employees
- Password reset emails
- Leave request notifications
- Generic email sending
- Connection verification
- Template-based HTML emails

### Configuration

Required environment variables:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@hrms.com
```

### Usage Example

```typescript
import { emailService } from './services';

// Send welcome email
await emailService.sendWelcomeEmail({
  name: 'John Doe',
  email: 'john@example.com',
  temporaryPassword: 'temp123',
  loginUrl: 'https://hrms.com/login'
});

// Send password reset
await emailService.sendPasswordResetEmail({
  name: 'John Doe',
  resetToken: 'token123',
  resetUrl: 'https://hrms.com/reset-password?token=token123',
  expiresIn: '1 hour'
});

// Send leave notification
await emailService.sendLeaveNotification('manager@example.com', {
  employeeName: 'John Doe',
  leaveType: 'Annual Leave',
  startDate: '2024-01-15',
  endDate: '2024-01-20',
  numberOfDays: 5,
  status: 'pending'
});
```

### Testing Email Service

```bash
# Verify email configuration
curl -X POST http://localhost:5000/api/v1/admin/verify-email
```

## 2. Notification Service

### Location
`backend/src/services/notification.service.ts`
`backend/src/config/websocket.ts`

### Purpose
Manages real-time notifications via WebSocket and persists them in the database.

### Features
- Real-time WebSocket notifications
- Persistent notification storage
- User, organization, company, and department level notifications
- Leave request notifications
- Attendance issue notifications
- Read/unread tracking
- Notification count
- Pagination support

### Configuration

Environment variables:
```env
WS_ENABLED=true
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret
```

### Usage Example

```typescript
import { createNotificationService } from './services';

// Get notification service from app
const notificationService = req.app.get('notificationService');

// Notify a single user
await notificationService.notifyUser(userId, {
  type: 'leave.request.created',
  title: 'New Leave Request',
  message: 'You have a new leave request to review',
  data: { leave_request_id: 'abc123' },
  priority: 'normal'
});

// Notify entire organization
await notificationService.notifyOrganization(organizationId, {
  type: 'announcement',
  title: 'System Maintenance',
  message: 'Scheduled maintenance tonight at 10 PM',
  priority: 'high'
});

// Notify about leave request
await notificationService.notifyLeaveRequest(leaveRequestId, 'approved');

// Get unread count
const count = await notificationService.getUnreadCount(userId);
```

### WebSocket Client Integration

Frontend example:
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connected', (data) => {
  console.log('Connected to notification server');
});

socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Update UI with notification
});

// Mark notification as read
socket.emit('notification:read', notificationId);

// Get unread count
socket.emit('notification:count');
socket.on('notification:count:response', (data) => {
  console.log('Unread count:', data.unread_count);
});
```

## 3. Upload Service

### Location
`backend/src/services/upload.service.ts`

### Purpose
Manages file uploads with validation, storage, and cleanup.

### Features
- Profile picture uploads (max 5MB)
- Document uploads (max 10MB)
- Multiple file uploads
- File type validation
- Automatic directory management
- File deletion
- Temporary file cleanup
- Move files between directories

### Supported File Types

**Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
**Documents**: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.txt`

### Configuration

Environment variable:
```env
UPLOAD_DIR=/app/uploads
```

### Usage Example

```typescript
import { uploadService } from './services';
import { Router } from 'express';

const router = Router();

// Profile picture upload
router.post('/profile-picture', 
  uploadService.profilePictureUpload(),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    res.json({ 
      success: true, 
      file: {
        path: filePath,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  }
);

// Document upload (multiple files)
router.post('/documents',
  uploadService.documentUpload(5),
  async (req, res) => {
    const files = req.files as Express.Multer.File[];
    res.json({ 
      success: true, 
      files: files.map(f => ({
        path: f.path,
        originalName: f.originalname,
        size: f.size
      }))
    });
  }
);

// Delete file
await uploadService.deleteFile('uploads/documents/file.pdf');

// Cleanup old temp files
await uploadService.cleanupTempFiles();
```

### File Storage Structure

```
uploads/
├── profiles/           # Profile pictures
├── documents/          # Employee documents
├── attachments/        # General attachments
└── temp/              # Temporary uploads
```

## 4. Cache Service

### Location
`backend/src/services/cache.service.ts`

### Purpose
Provides Redis-based caching for improved performance.

### Features
- Key-value storage with TTL
- Session management
- Employee data caching
- Organization data caching
- Rate limiting
- Pattern-based key deletion
- Cache statistics
- Get-or-set pattern

### Configuration

Environment variables:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
```

### Usage Example

```typescript
import { cacheService, CacheKeys } from './services';

// Basic caching
await cacheService.set('user:123', userData, 3600); // TTL: 1 hour
const user = await cacheService.get('user:123');

// Get or set pattern
const employee = await cacheService.getOrSet(
  CacheKeys.employee(employeeId),
  async () => {
    // This function only runs if cache miss
    return await fetchEmployeeFromDatabase(employeeId);
  },
  3600 // Cache for 1 hour
);

// Session management
await cacheService.setSession(userId, sessionData, 86400); // 24 hours
const session = await cacheService.getSession(userId);
await cacheService.deleteSession(userId);

// Employee caching
await cacheService.cacheEmployee(employeeId, employeeData);
const cachedEmployee = await cacheService.getCachedEmployee(employeeId);
await cacheService.invalidateEmployee(employeeId);

// Rate limiting
const requestCount = await cacheService.incrementRateLimit(
  `api:${userId}`, 
  60 // 60 second window
);
if (requestCount && requestCount > 100) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}

// Pattern deletion
await cacheService.delPattern('employee:*');

// Cache statistics
const stats = await cacheService.getStats();
```

### Pre-defined Cache Keys

```typescript
CacheKeys.employee(employeeId)           // employee:{id}
CacheKeys.organization(organizationId)   // organization:{id}
CacheKeys.session(userId)                // session:{id}
CacheKeys.rateLimit(identifier)          // ratelimit:{id}
CacheKeys.leaveBalance(employeeId)       // leave:balance:{id}
CacheKeys.attendance(employeeId, date)   // attendance:{id}:{date}
```

## Service Integration in Server

All services are automatically initialized when the server starts:

```typescript
// backend/src/server.ts
import { setupWebSocket } from './config/websocket';
import { createNotificationService, emailService, cacheService } from './services';

// Database connection
await pool.query('SELECT NOW()');

// Redis connection
await connectRedis();
await cacheService.ping();

// Email service verification
await emailService.verifyConnection();

// WebSocket setup
const io = setupWebSocket(httpServer, pool);
const notificationService = createNotificationService(io, pool);
app.set('notificationService', notificationService);
```

## Running Services with Docker

### Development

```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up postgres redis
```

### Production

```bash
# Build and start
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Service Health Checks

### Email Service
```bash
curl http://localhost:5000/api/v1/health/email
```

### Cache Service
```bash
curl http://localhost:5000/api/v1/health/cache
```

### WebSocket Service
```bash
# Check from browser console
const socket = io('http://localhost:5000');
socket.emit('ping');
socket.on('pong', (data) => console.log('Pong received:', data));
```

## Monitoring and Logs

All services use Winston logger:

```typescript
import { logger } from './config/logger';

logger.info('Service initialized');
logger.warn('Service degraded');
logger.error('Service failed', error);
```

Logs are stored in:
- Console output (development)
- `/app/logs/` directory (production)

## Troubleshooting

### Email Service Not Working

1. Check SMTP configuration in `.env`
2. Verify SMTP credentials
3. Check firewall rules for SMTP ports
4. Test with: `await emailService.verifyConnection()`

### WebSocket Not Connecting

1. Verify `WS_ENABLED=true` in environment
2. Check JWT token is valid
3. Verify CORS settings allow frontend origin
4. Check browser console for connection errors

### Cache Service Issues

1. Verify Redis is running: `docker-compose ps redis`
2. Check Redis connection: `await cacheService.ping()`
3. Verify Redis credentials in `.env`
4. Check Redis logs: `docker-compose logs redis`

### Upload Service Issues

1. Check upload directory exists and is writable
2. Verify file size limits
3. Check allowed file types
4. Ensure sufficient disk space

## Performance Recommendations

### Email Service
- Use email queues for bulk sending
- Implement retry logic for failed emails
- Cache email templates

### Notification Service
- Batch notifications when possible
- Use database indexing on notification queries
- Implement notification cleanup for old records

### Cache Service
- Set appropriate TTL values
- Monitor cache hit/miss ratios
- Implement cache warming for critical data
- Regular cleanup of expired keys

### Upload Service
- Implement file size validation before upload
- Use CDN for serving static files
- Regular cleanup of temporary files
- Consider cloud storage (S3) for production

## Security Considerations

1. **Email Service**: Never log email credentials, use app-specific passwords
2. **Notification Service**: Always verify JWT tokens, sanitize notification content
3. **Upload Service**: Validate file types, scan for malware, limit file sizes
4. **Cache Service**: Don't cache sensitive data, use encryption for sensitive keys

## Next Steps

1. Set up monitoring and alerting
2. Implement service health endpoints
3. Add rate limiting to all services
4. Set up log aggregation
5. Configure backup strategies
6. Implement service metrics collection
