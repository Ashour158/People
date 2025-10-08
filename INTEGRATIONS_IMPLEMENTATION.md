# Phase 6: API & Integrations Implementation Guide

## Overview

This document describes the implementation of Phase 6 features from the ROADMAP: Platform & Integration capabilities including webhooks, OAuth 2.0, API keys, and comprehensive API documentation.

## Features Implemented

### 1. Webhooks System ✅

Webhooks allow external systems to receive real-time notifications about events in the HR system.

#### Key Features
- Register webhook endpoints with event subscriptions
- HMAC-SHA256 signature verification for security
- Automatic retry with exponential backoff
- Delivery logs and monitoring
- Support for custom headers
- Configurable timeout and retry policies

#### Database Tables
- `webhook_endpoints` - Registered webhook URLs
- `webhook_deliveries` - Delivery logs and status
- `webhook_events` - Catalog of available events

#### API Endpoints

```
POST   /api/v1/webhooks              - Register new webhook
GET    /api/v1/webhooks              - List all webhooks
GET    /api/v1/webhooks/:id          - Get webhook details
PUT    /api/v1/webhooks/:id          - Update webhook
DELETE /api/v1/webhooks/:id          - Delete webhook
POST   /api/v1/webhooks/:id/test     - Test webhook
GET    /api/v1/webhooks/:id/deliveries - Get delivery logs
```

#### Available Events

- `employee.created` - New employee created
- `employee.updated` - Employee details updated
- `employee.deleted` - Employee deleted
- `leave.requested` - Leave request submitted
- `leave.approved` - Leave request approved
- `leave.rejected` - Leave request rejected
- `attendance.checkin` - Employee checked in
- `attendance.checkout` - Employee checked out
- `payroll.processed` - Payroll run completed
- `performance.review_completed` - Performance review completed

#### Usage Example

**Register a webhook:**
```bash
curl -X POST http://localhost:5000/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Employee Updates",
    "url": "https://example.com/webhooks/hr",
    "events": ["employee.created", "employee.updated"],
    "headers": {
      "X-Custom-Header": "value"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook registered successfully",
  "data": {
    "webhook_id": "uuid",
    "name": "Employee Updates",
    "url": "https://example.com/webhooks/hr",
    "secret_key": "your-secret-key-shown-only-once",
    "events": ["employee.created", "employee.updated"],
    "is_active": true
  }
}
```

**Webhook Payload Format:**
```json
{
  "event_id": "uuid",
  "event_type": "employee.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "employee": {
      "employee_id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com"
    }
  }
}
```

**Verify Webhook Signature:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secretKey) {
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = `sha256=${hmac.digest('hex')}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook endpoint
app.post('/webhooks/hr', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  
  if (!verifyWebhookSignature(payload, signature, YOUR_SECRET_KEY)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook event
  console.log('Received event:', payload.event_type);
  res.status(200).send('OK');
});
```

### 2. OAuth 2.0 Authentication ✅

OAuth 2.0 support for SSO and social login with popular providers.

#### Supported Providers
- Google
- Microsoft (Azure AD)
- GitHub
- LinkedIn

#### Database Tables
- `oauth_providers` - OAuth provider configurations
- `oauth_tokens` - User OAuth tokens

#### API Endpoints

```
GET  /api/v1/oauth/providers           - List available OAuth providers
GET  /api/v1/oauth/authorize/:provider - Start OAuth flow
GET  /api/v1/oauth/callback/:provider  - OAuth callback
GET  /api/v1/oauth/connected           - List connected accounts
POST /api/v1/oauth/disconnect/:provider - Disconnect OAuth account
POST /api/v1/oauth/providers           - Register OAuth provider (Admin)
```

#### Usage Example

**Start OAuth Flow:**
```bash
curl -X GET "http://localhost:5000/api/v1/oauth/authorize/google?redirect_uri=http://localhost:3000/oauth/callback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    "state": "csrf-protection-token"
  }
}
```

**Register OAuth Provider (Admin):**
```bash
curl -X POST http://localhost:5000/api/v1/oauth/providers \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_name": "google",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "auto_create_users": false
  }'
```

### 3. API Keys ✅

Secure API keys for third-party integrations with granular permissions and rate limiting.

#### Key Features
- Generate secure API keys with bcrypt hashing
- Configurable permissions (read, write, delete)
- Scope-based access control
- Rate limiting per key
- IP whitelisting
- Usage tracking and analytics
- Automatic expiration

#### Database Tables
- `api_keys` - API key records
- `api_key_usage` - Usage logs
- `integration_rate_limits` - Rate limit tracking

#### API Endpoints

```
POST   /api/v1/api-keys              - Generate new API key
GET    /api/v1/api-keys              - List API keys
GET    /api/v1/api-keys/:id          - Get API key details
PUT    /api/v1/api-keys/:id          - Update API key
POST   /api/v1/api-keys/:id/revoke   - Revoke API key
GET    /api/v1/api-keys/:id/usage    - Get usage statistics
```

#### Usage Example

**Generate API Key:**
```bash
curl -X POST http://localhost:5000/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key_name": "Production Integration",
    "permissions": ["read", "write"],
    "scopes": ["employees", "attendance"],
    "rate_limit_per_hour": 5000,
    "ip_whitelist": ["192.168.1.100"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "API key generated successfully",
  "data": {
    "api_key_id": "uuid",
    "key_name": "Production Integration",
    "key": "pk_1234567890abcdef...",
    "permissions": ["read", "write"],
    "rate_limit_per_hour": 5000
  },
  "warning": "Please save this API key securely. It will not be shown again."
}
```

**Using API Key:**
```bash
curl -X GET http://localhost:5000/api/v1/employees \
  -H "X-API-Key: pk_1234567890abcdef..."
```

**Rate Limit Headers:**
```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 2024-01-15T11:00:00Z
```

### 4. API Documentation ✅

Comprehensive API documentation using Swagger/OpenAPI 3.0.

#### Features
- Interactive API explorer
- Authentication support
- Request/response examples
- Schema definitions
- Try-it-out functionality

#### Access Documentation

- **Interactive UI**: http://localhost:5000/api-docs
- **OpenAPI JSON**: http://localhost:5000/api-docs.json

### 5. Integration Logging & Monitoring ✅

#### Database Tables
- `integration_logs` - Comprehensive logging for all integrations

#### Logged Information
- Request/response data
- Status and errors
- Duration metrics
- IP addresses and user agents

## Database Setup

Run the integration schema to create all necessary tables:

```bash
psql hr_system < integrations_schema.sql
```

This creates:
- 15+ new tables for integrations
- Indexes for performance
- Foreign key constraints
- Default webhook events

## Configuration

Add to your `.env` file:

```env
# API Documentation
API_DOCS_ENABLED=true

# OAuth Providers (example for Google)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Webhook Settings
WEBHOOK_RETRY_MAX_ATTEMPTS=3
WEBHOOK_TIMEOUT_SECONDS=30

# Rate Limiting
DEFAULT_RATE_LIMIT_PER_HOUR=1000
```

## Security Considerations

### Webhooks
1. **Always verify signatures** - Never trust webhook payloads without verification
2. **Use HTTPS** - Webhook URLs must use HTTPS in production
3. **Retry logic** - Implement idempotency in your webhook handlers
4. **Secret rotation** - Regularly rotate webhook secrets

### OAuth
1. **State validation** - Always validate state parameter to prevent CSRF
2. **Secure storage** - Encrypt OAuth tokens in database
3. **Token refresh** - Implement automatic token refresh
4. **Scope minimization** - Request only necessary scopes

### API Keys
1. **Secure storage** - Keys are bcrypt hashed, never store plain text
2. **Rotation policy** - Encourage regular key rotation
3. **Principle of least privilege** - Grant minimum required permissions
4. **IP whitelisting** - Use when possible for additional security
5. **Monitor usage** - Set up alerts for unusual activity

## Integration Examples

### Example 1: Employee Created Webhook

When a new employee is created, the system automatically triggers webhooks:

```typescript
// In employee.service.ts
import { getWebhookEmitter } from '../utils/webhookEmitter';

async createEmployee(data: EmployeeData) {
  const employee = await this.db.query(/* insert employee */);
  
  // Trigger webhook
  await getWebhookEmitter().emitEmployeeCreated(
    employee.organization_id,
    employee
  );
  
  return employee;
}
```

### Example 2: API Key Authentication

```typescript
// Use API key middleware for public API routes
import { createApiKeyAuthMiddleware } from '../middleware/apiKeyAuth';

const apiKeyAuth = createApiKeyAuthMiddleware(db);

router.get('/public/employees', 
  apiKeyAuth,
  employeeController.getEmployees
);
```

### Example 3: OAuth Login Flow

```typescript
// Frontend - Start OAuth flow
const response = await fetch('/api/v1/oauth/authorize/google?redirect_uri=...', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { authorization_url } = await response.json();

// Redirect user to authorization_url
window.location.href = authorization_url;

// Handle callback
app.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  const response = await fetch(`/api/v1/oauth/callback/google?code=${code}&state=${state}`);
  const result = await response.json();
  
  // User is now authenticated
  console.log('Connected:', result.data.user_info);
});
```

## Testing

### Test Webhook Endpoint

```bash
# Test a webhook
curl -X POST http://localhost:5000/api/v1/webhooks/:id/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test API Key

```bash
# Generate test key
curl -X POST http://localhost:5000/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"key_name": "Test Key", "permissions": ["read"]}'

# Use test key
curl -X GET http://localhost:5000/api/v1/employees \
  -H "X-API-Key: YOUR_TEST_KEY"
```

## Monitoring

### Webhook Delivery Monitoring

```sql
-- Check webhook delivery success rate
SELECT 
  w.name,
  COUNT(*) as total_deliveries,
  COUNT(*) FILTER (WHERE wd.status = 'delivered') as successful,
  COUNT(*) FILTER (WHERE wd.status = 'failed') as failed
FROM webhook_endpoints w
JOIN webhook_deliveries wd ON w.webhook_id = wd.webhook_id
WHERE wd.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY w.webhook_id, w.name;
```

### API Key Usage

```sql
-- Top API keys by usage
SELECT 
  ak.key_name,
  COUNT(*) as request_count,
  AVG(aku.response_time_ms) as avg_response_time
FROM api_keys ak
JOIN api_key_usage aku ON ak.api_key_id = aku.api_key_id
WHERE aku.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ak.api_key_id, ak.key_name
ORDER BY request_count DESC
LIMIT 10;
```

## Next Steps

### Planned Enhancements (Future)
- Slack integration
- Microsoft Teams integration  
- Email service integrations (SendGrid, AWS SES)
- Calendar sync (Google Calendar, Outlook)
- SSO with SAML
- SCIM provisioning
- Accounting software integrations
- Job board integrations

## Support

For questions or issues:
1. Check API documentation at `/api-docs`
2. Review integration logs in database
3. Enable debug logging with `DEBUG=hr:*`
4. Contact support team

## Changelog

### Version 1.0.0 (2024-01-15)
- ✅ Webhooks system implementation
- ✅ OAuth 2.0 authentication
- ✅ API key management
- ✅ API documentation with Swagger
- ✅ Integration logging and monitoring
- ✅ Rate limiting
- ✅ Security best practices
