# Quick Start Guide - Infrastructure Services

This guide will help you quickly set up and test the 4 core infrastructure services of the HR Management System.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if running locally)
- Redis 7+ (if running locally)

## Quick Start with Docker

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/Ashour158/People.git
cd People

# Copy environment file
cp .env.example .env

# Edit .env with your email configuration (optional)
nano .env
```

### 2. Start All Services

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### 3. Verify Services

```bash
# Overall health check
curl http://localhost:5000/health

# Database health
curl http://localhost:5000/health/database

# Cache health
curl http://localhost:5000/health/cache

# Email service health
curl http://localhost:5000/health/email

# WebSocket health
curl http://localhost:5000/health/websocket
```

## Service Configuration

### Email Service Setup

To enable email notifications, configure SMTP settings in your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@hrms.com
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use the app password in `SMTP_PASSWORD`

### WebSocket Service

WebSocket is enabled by default. To disable:

```env
WS_ENABLED=false
```

The WebSocket server runs on the same port as the backend (default: 5000).

### File Upload Configuration

Set the upload directory:

```env
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760
```

### Redis Cache Configuration

Redis configuration (default values work with docker-compose):

```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Testing the Services

### 1. Test Email Service

```bash
# After registering a user, they should receive a welcome email
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### 2. Test WebSocket Notifications

Create a simple HTML file to test WebSocket:

```html
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Test</title>
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
  <h1>WebSocket Test</h1>
  <div id="status">Disconnected</div>
  <div id="notifications"></div>

  <script>
    // Replace with your JWT token after login
    const token = 'YOUR_JWT_TOKEN_HERE';
    
    const socket = io('http://localhost:5000', {
      auth: { token }
    });

    socket.on('connected', (data) => {
      document.getElementById('status').textContent = 'Connected: ' + data.message;
    });

    socket.on('notification', (notification) => {
      const div = document.createElement('div');
      div.textContent = JSON.stringify(notification);
      document.getElementById('notifications').appendChild(div);
    });

    socket.emit('notification:count');
    socket.on('notification:count:response', (data) => {
      console.log('Unread count:', data.unread_count);
    });
  </script>
</body>
</html>
```

### 3. Test File Upload

```bash
# Upload a profile picture (requires authentication)
curl -X POST http://localhost:5000/api/v1/employees/profile-picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "profile_picture=@/path/to/image.jpg"
```

### 4. Test Cache Service

The cache service is used internally. You can verify it's working by:

```bash
# Check cache health
curl http://localhost:5000/health/cache

# The response should show:
# {"status":"healthy","responseTime":"XYms","timestamp":"..."}
```

## Local Development (Without Docker)

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (if needed)
cd frontend
npm install
```

### 2. Setup Local Services

```bash
# Start PostgreSQL (Ubuntu/Debian)
sudo systemctl start postgresql

# Start Redis
redis-server

# Or use Docker for just the databases
docker-compose up -d postgres redis
```

### 3. Setup Database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE hr_system;"

# Run migrations
psql -U postgres hr_system < enhanced_hr_schema.sql
```

### 4. Configure Environment

```bash
cd backend
cp .env.example .env

# Edit for local development
nano .env
```

Change these values for local development:
```env
NODE_ENV=development
DB_HOST=localhost
REDIS_HOST=localhost
```

### 5. Start Backend

```bash
cd backend

# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

## Monitoring Services

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Check Service Status

```bash
# Container status
docker-compose ps

# Service health
curl http://localhost:5000/health
```

### Redis Monitoring

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check keys
127.0.0.1:6379> KEYS *

# Get cache stats
127.0.0.1:6379> INFO stats
```

### Database Monitoring

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres hr_system

# Check active connections
hr_system=# SELECT count(*) FROM pg_stat_activity;

# Check database size
hr_system=# SELECT pg_size_pretty(pg_database_size('hr_system'));
```

## Common Issues and Solutions

### Email Not Sending

**Problem:** Emails are not being sent

**Solutions:**
1. Verify SMTP credentials in `.env`
2. Check if SMTP port (587) is not blocked by firewall
3. For Gmail, ensure app password is used, not regular password
4. Check backend logs: `docker-compose logs backend | grep -i email`

### WebSocket Not Connecting

**Problem:** WebSocket connection fails

**Solutions:**
1. Ensure `WS_ENABLED=true` in `.env`
2. Verify JWT token is valid
3. Check CORS settings allow your frontend URL
4. Verify port 5000 is accessible
5. Check browser console for connection errors

### File Upload Failing

**Problem:** File uploads are rejected

**Solutions:**
1. Check file size (max 10MB for documents, 5MB for images)
2. Verify file type is allowed
3. Ensure upload directory has write permissions
4. Check available disk space
5. Review logs: `docker-compose logs backend | grep -i upload`

### Cache Not Working

**Problem:** Cache service unavailable

**Solutions:**
1. Verify Redis is running: `docker-compose ps redis`
2. Check Redis connectivity: `docker-compose exec redis redis-cli ping`
3. Verify Redis configuration in `.env`
4. Check Redis logs: `docker-compose logs redis`

## Performance Tips

### Email Service
- Consider using a dedicated email queue for bulk sending
- Use email templates for consistent branding
- Monitor email delivery rates

### WebSocket Service
- Use rooms efficiently to reduce broadcast overhead
- Implement reconnection logic in frontend
- Monitor active connections

### Upload Service
- Run cleanup of temp files regularly (cron job)
- Consider using CDN for serving uploaded files
- Implement file compression for images

### Cache Service
- Set appropriate TTL values (not too long, not too short)
- Monitor cache hit/miss rates
- Use cache for expensive database queries
- Clear cache when data is updated

## Next Steps

1. **Configure Production Email**: Set up a production email service (SendGrid, AWS SES)
2. **Enable HTTPS**: Configure SSL certificates for production
3. **Set Up Monitoring**: Implement Prometheus + Grafana
4. **Configure Backups**: Set up automated database backups
5. **Load Testing**: Test system under load
6. **Security Audit**: Review security settings

## Additional Resources

- [Full Service Documentation](./SERVICES.md)
- [Integration Guide](../INTEGRATION_GUIDE.md)
- [API Documentation](../api_documentation.md)
- [Deployment Guide](../deployment_configs.txt)

## Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Verify service health: `curl http://localhost:5000/health`
3. Review documentation in the `docs/` directory
4. Check existing GitHub issues
5. Create a new issue with detailed information

## License

This project is licensed under the terms specified in the LICENSE file.
