# 🔗 People HR - Phase 6 Integrations

> **Enterprise-grade API integrations, webhooks, OAuth 2.0, and comprehensive API documentation**

## 🎯 Overview

Phase 6 brings powerful integration capabilities to the People HR Management System, enabling seamless connectivity with external systems and third-party applications.

## ✨ Features

### 🔔 Webhooks
Real-time event notifications delivered to your endpoints whenever something happens in the system.

- **10 Event Types**: Employee, leave, attendance, payroll, and performance events
- **Security**: HMAC-SHA256 signature verification
- **Reliability**: Automatic retry with exponential backoff
- **Monitoring**: Comprehensive delivery logs and status tracking
- **Flexibility**: Custom headers and configurable timeouts

### 🔐 OAuth 2.0
Single Sign-On (SSO) and social login with popular providers.

- **4 Providers**: Google, Microsoft, GitHub, LinkedIn
- **Standard Flow**: Full OAuth 2.0 authorization code flow
- **Token Management**: Automatic refresh and secure storage
- **Multi-tenant**: Different providers per organization

### 🔑 API Keys
Secure programmatic access for third-party integrations.

- **Security**: Bcrypt hashed, never stored in plain text
- **Rate Limiting**: Per-key limits (default 1000/hour)
- **IP Whitelisting**: Additional security layer
- **Permissions**: Granular read/write/delete permissions
- **Scopes**: Resource-level access control
- **Analytics**: Comprehensive usage tracking

### 📚 API Documentation
Interactive API documentation with Swagger UI.

- **Interactive UI**: Try API calls directly in browser
- **OpenAPI 3.0**: Industry-standard specification
- **Complete**: All endpoints documented
- **Examples**: Request/response samples
- **Authentication**: JWT and API key docs

## 🚀 Quick Start

### 1. Setup Database

```bash
psql -U postgres -d hr_system -f integrations_schema.sql
```

### 2. Start Server

```bash
cd backend
npm install
npm run dev
```

### 3. Access API Documentation

Open in browser: http://localhost:5000/api-docs

### 4. Create Your First Webhook

```bash
# Login to get JWT token
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Register webhook
curl -X POST http://localhost:5000/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Webhook",
    "url": "https://webhook.site/unique-url",
    "events": ["employee.created"]
  }'
```

### 5. Generate API Key

```bash
curl -X POST http://localhost:5000/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key_name": "Integration Key",
    "permissions": ["read"],
    "scopes": ["employees"]
  }'
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [**INTEGRATIONS_QUICKSTART.md**](./INTEGRATIONS_QUICKSTART.md) | Step-by-step guide with examples |
| [**INTEGRATIONS_IMPLEMENTATION.md**](./INTEGRATIONS_IMPLEMENTATION.md) | Complete technical documentation |
| [**WEBHOOK_INTEGRATION_GUIDE.md**](./WEBHOOK_INTEGRATION_GUIDE.md) | How to integrate webhooks in code |
| [**API Docs**](http://localhost:5000/api-docs) | Interactive Swagger UI |

## 🌐 API Endpoints

### Webhooks
```
POST   /api/v1/webhooks              Register webhook
GET    /api/v1/webhooks              List webhooks
PUT    /api/v1/webhooks/:id          Update webhook
DELETE /api/v1/webhooks/:id          Delete webhook
POST   /api/v1/webhooks/:id/test     Test webhook
GET    /api/v1/webhooks/:id/deliveries  Delivery logs
```

### OAuth
```
GET  /api/v1/oauth/providers         List providers
GET  /api/v1/oauth/authorize/:provider  Start OAuth
GET  /api/v1/oauth/callback/:provider   OAuth callback
GET  /api/v1/oauth/connected         Connected accounts
POST /api/v1/oauth/disconnect/:provider Disconnect
```

### API Keys
```
POST   /api/v1/api-keys              Generate key
GET    /api/v1/api-keys              List keys
PUT    /api/v1/api-keys/:id          Update key
POST   /api/v1/api-keys/:id/revoke   Revoke key
GET    /api/v1/api-keys/:id/usage    Usage stats
```

## 🔒 Security

### Webhooks
- ✅ HMAC-SHA256 signature verification
- ✅ HTTPS only in production
- ✅ Unique secret per webhook
- ✅ Configurable retry limits

### OAuth
- ✅ State tokens for CSRF protection
- ✅ Token encryption at rest
- ✅ Automatic token refresh
- ✅ Scope minimization

### API Keys
- ✅ Bcrypt hashing (10 rounds)
- ✅ Never store plain text
- ✅ IP whitelisting
- ✅ Rate limiting per key
- ✅ Comprehensive audit logs

## 📊 Available Webhook Events

| Event | Description |
|-------|-------------|
| `employee.created` | New employee created |
| `employee.updated` | Employee details updated |
| `employee.deleted` | Employee deleted |
| `leave.requested` | Leave request submitted |
| `leave.approved` | Leave request approved |
| `leave.rejected` | Leave request rejected |
| `attendance.checkin` | Employee checked in |
| `attendance.checkout` | Employee checked out |
| `payroll.processed` | Payroll run completed |
| `performance.review_completed` | Performance review done |

## 💡 Examples

### Webhook Payload Example
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "employee.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "employee": {
      "employee_id": "...",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "department": "Engineering"
    }
  }
}
```

### Using API Key
```bash
# Instead of JWT token, use X-API-Key header
curl -X GET http://localhost:5000/api/v1/employees \
  -H "X-API-Key: pk_your_api_key_here"
```

### Rate Limit Response
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2024-01-15T11:00:00Z
```

## 🧪 Testing

### Test Webhooks
1. Visit https://webhook.site to get a test URL
2. Register webhook with that URL
3. Create an employee
4. See payload appear in webhook.site

### Test API Keys
```bash
# Generate key
curl -X POST http://localhost:5000/api/v1/api-keys ...

# Use key to access API
curl -X GET http://localhost:5000/api/v1/employees \
  -H "X-API-Key: YOUR_KEY"

# Check usage stats
curl -X GET http://localhost:5000/api/v1/api-keys/KEY_ID/usage \
  -H "Authorization: Bearer TOKEN"
```

## 📈 Monitoring

### Database Queries

**Webhook Success Rate:**
```sql
SELECT 
  we.name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE wd.status = 'delivered') as successful
FROM webhook_endpoints we
JOIN webhook_deliveries wd ON we.webhook_id = wd.webhook_id
GROUP BY we.name;
```

**API Key Usage:**
```sql
SELECT 
  ak.key_name,
  COUNT(*) as requests,
  AVG(aku.response_time_ms) as avg_time
FROM api_keys ak
JOIN api_key_usage aku ON ak.api_key_id = aku.api_key_id
WHERE aku.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ak.key_name;
```

## 🛠️ Technology Stack

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL 15+
- **Security**: bcrypt, HMAC-SHA256, JWT
- **Documentation**: Swagger UI + OpenAPI 3.0
- **HTTP Client**: axios

## 📦 Database Schema

15+ new tables including:
- `webhook_endpoints` - Webhook configurations
- `webhook_deliveries` - Delivery logs
- `oauth_providers` - OAuth provider configs
- `oauth_tokens` - User OAuth tokens
- `api_keys` - API key records
- `api_key_usage` - Usage tracking
- `integration_logs` - Comprehensive logs
- And more...

## 🎯 Use Cases

### 1. Slack Notifications
Set up webhook to send employee updates to Slack channel.

### 2. External HR System Sync
Use webhooks to keep external systems in sync with employee data.

### 3. Mobile App Integration
Use API keys for secure mobile app access.

### 4. SSO Login
Enable Google or Microsoft login with OAuth 2.0.

### 5. Analytics Dashboard
Pull data using API keys for custom analytics.

### 6. Automated Workflows
Trigger external workflows based on HR events.

## 🔧 Configuration

Add to `.env`:
```env
# OAuth Providers
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Webhook Settings
WEBHOOK_RETRY_MAX_ATTEMPTS=3
WEBHOOK_TIMEOUT_SECONDS=30

# Rate Limiting
DEFAULT_RATE_LIMIT_PER_HOUR=1000
```

## 🚦 Status

| Feature | Status | Priority |
|---------|--------|----------|
| Webhooks | ✅ Complete | High |
| OAuth 2.0 | ✅ Complete | High |
| API Keys | ✅ Complete | High |
| API Docs | ✅ Complete | High |
| Slack Integration | ⏳ Planned | Medium |
| Teams Integration | ⏳ Planned | Medium |
| Calendar Sync | ⏳ Planned | Medium |

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

## 🆘 Support

- **Documentation**: Check `/api-docs` endpoint
- **Issues**: Create GitHub issue
- **Email**: support@people-hr.com

## 🎉 What's Next?

- [ ] Slack integration
- [ ] Microsoft Teams integration
- [ ] Calendar sync implementation (Google/Outlook)
- [ ] SAML SSO support
- [ ] SCIM provisioning
- [ ] Accounting software integrations
- [ ] Job board integrations

---

Built with ❤️ by the People HR Team

**Version**: 1.0.0 | **Last Updated**: January 2024
