# Backend Services

This directory contains the core infrastructure services that power the HR Management System.

## Services Overview

### 1. Email Service (`email.service.ts`)
Handles all email communications using Nodemailer.

**Features:**
- Welcome emails
- Password reset emails
- Leave notifications
- Generic email sending

**Usage:**
```typescript
import { emailService } from './services';

await emailService.sendWelcomeEmail({
  name: 'John Doe',
  email: 'john@example.com',
  temporaryPassword: 'temp123',
  loginUrl: 'https://hrms.com/login'
});
```

### 2. Notification Service (`notification.service.ts`)
Manages real-time notifications via WebSocket with database persistence.

**Features:**
- Real-time WebSocket notifications
- Persistent storage
- Multi-level notifications (user, org, company, department)
- Read/unread tracking

**Usage:**
```typescript
const notificationService = req.app.get('notificationService');

await notificationService.notifyUser(userId, {
  type: 'leave.request.created',
  title: 'New Leave Request',
  message: 'You have a new leave request',
  priority: 'normal'
});
```

### 3. Upload Service (`upload.service.ts`)
Manages file uploads with validation and storage.

**Features:**
- Profile picture uploads (max 5MB)
- Document uploads (max 10MB)
- File type validation
- Automatic cleanup

**Usage:**
```typescript
import { uploadService } from './services';

router.post('/upload', 
  uploadService.profilePictureUpload(),
  (req, res) => {
    res.json({ file: req.file });
  }
);
```

### 4. Cache Service (`cache.service.ts`)
Provides Redis-based caching for improved performance.

**Features:**
- Key-value storage with TTL
- Session management
- Rate limiting
- Pattern-based operations

**Usage:**
```typescript
import { cacheService, CacheKeys } from './services';

// Get or set pattern
const employee = await cacheService.getOrSet(
  CacheKeys.employee(employeeId),
  async () => fetchFromDatabase(employeeId),
  3600
);
```

## Domain Services

### Authentication Service (`auth.service.ts`)
Handles user authentication and authorization.

### Employee Service (`employee.service.ts`)
Manages employee CRUD operations.

### Attendance Service (`attendance.service.ts`)
Tracks employee attendance.

### Leave Service (`leave.service.ts`)
Manages leave requests and approvals.

### Audit Service (`AuditService.ts`)
Logs system activities for audit trails.

### Payroll Run Service (`PayrollRunService.ts`)
Manages payroll processing.

## Service Initialization

All services are initialized in `server.ts`:

```typescript
import { 
  emailService, 
  cacheService, 
  createNotificationService 
} from './services';

// Services are automatically initialized on import
const io = setupWebSocket(httpServer, pool);
const notificationService = createNotificationService(io, pool);
```

## Configuration

Services are configured via environment variables. See `.env.example` for all available options.

## Testing

Services include built-in health checks:

```bash
# Check all services
curl http://localhost:5000/health

# Individual services
curl http://localhost:5000/health/email
curl http://localhost:5000/health/cache
curl http://localhost:5000/health/websocket
```

## Documentation

For detailed documentation, see:
- [Full Service Documentation](../../docs/SERVICES.md)
- [Quick Start Guide](../../docs/QUICKSTART.md)
- [Integration Guide](../../INTEGRATION_GUIDE.md)
