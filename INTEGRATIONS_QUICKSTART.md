# Phase 6 Integrations - Quick Start Guide

## Setup Instructions

### 1. Database Setup

Run the integrations schema:

```bash
psql -U postgres -d hr_system -f integrations_schema.sql
```

This creates all necessary tables for webhooks, OAuth, API keys, email providers, calendar integrations, and more.

### 2. Install Dependencies

Dependencies are already installed in the project. If you need to reinstall:

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Add to your `backend/.env` file:

```env
# OAuth Providers (Optional - configure if you want to use OAuth)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Webhook Settings
WEBHOOK_RETRY_MAX_ATTEMPTS=3
WEBHOOK_TIMEOUT_SECONDS=30

# Rate Limiting
DEFAULT_RATE_LIMIT_PER_HOUR=1000
```

### 4. Start the Server

```bash
cd backend
npm run dev
```

The server will start on http://localhost:5000

## Quick Start Examples

### Example 1: View API Documentation

Open your browser and navigate to:

```
http://localhost:5000/api-docs
```

This will show the interactive Swagger UI with all API endpoints documented.

### Example 2: Register a Webhook

First, get your JWT token by logging in:

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'
```

Then register a webhook:

```bash
curl -X POST http://localhost:5000/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Webhook",
    "url": "https://webhook.site/your-unique-url",
    "events": ["employee.created", "employee.updated"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook registered successfully",
  "data": {
    "webhook_id": "...",
    "name": "Test Webhook",
    "url": "https://webhook.site/your-unique-url",
    "secret_key": "save-this-secret-key",
    "events": ["employee.created", "employee.updated"],
    "is_active": true
  }
}
```

**Note:** Visit https://webhook.site to get a free webhook URL for testing.

### Example 3: Generate an API Key

```bash
curl -X POST http://localhost:5000/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key_name": "Test API Key",
    "permissions": ["read"],
    "scopes": ["employees"],
    "rate_limit_per_hour": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "API key generated successfully",
  "data": {
    "api_key_id": "...",
    "key_name": "Test API Key",
    "key": "pk_1234567890abcdef...",
    "permissions": ["read"],
    "rate_limit_per_hour": 100
  },
  "warning": "Please save this API key securely. It will not be shown again."
}
```

### Example 4: Use API Key to Access Endpoints

```bash
# Use the API key instead of JWT token
curl -X GET http://localhost:5000/api/v1/employees \
  -H "X-API-Key: pk_1234567890abcdef..."
```

The response will include rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 2024-01-15T11:00:00Z
```

### Example 5: Test Webhook Event

After creating an employee, the webhook will automatically fire:

```bash
# Create an employee (this will trigger webhook)
curl -X POST http://localhost:5000/api/v1/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "department_id": "...",
    "designation_id": "..."
  }'
```

Check your webhook URL (e.g., webhook.site) to see the payload:

```json
{
  "event_id": "...",
  "event_type": "employee.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "employee": {
      "employee_id": "...",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com"
    }
  }
}
```

### Example 6: View Webhook Deliveries

Check the delivery status of your webhooks:

```bash
curl -X GET http://localhost:5000/api/v1/webhooks/YOUR_WEBHOOK_ID/deliveries \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 7: OAuth Flow (Optional)

If you've configured OAuth providers:

1. Get authorization URL:
```bash
curl -X GET "http://localhost:5000/api/v1/oauth/authorize/google?redirect_uri=http://localhost:3000/callback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

2. Visit the returned `authorization_url` in your browser
3. After authorization, handle the callback with the code and state parameters

## Testing Tips

### Test Webhooks with webhook.site

1. Go to https://webhook.site
2. Copy your unique URL
3. Use that URL when registering a webhook
4. Perform actions in the HR system (create employee, etc.)
5. See the webhook payloads appear in real-time on webhook.site

### Test API Keys

1. Generate an API key with limited permissions
2. Try accessing different endpoints
3. Verify rate limiting works by making many requests
4. Check usage statistics

### Test OAuth (Requires Provider Setup)

1. Create OAuth app in Google/Microsoft developer console
2. Get client ID and secret
3. Register provider via API or database
4. Test authorization flow

## Monitoring and Debugging

### View Integration Logs

```sql
-- Check webhook deliveries
SELECT * FROM webhook_deliveries 
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Check API key usage
SELECT * FROM api_key_usage
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Check integration logs
SELECT * FROM integration_logs
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### Check Rate Limits

```sql
SELECT * FROM integration_rate_limits
WHERE window_start >= NOW() - INTERVAL '1 hour';
```

### View Webhook Events Catalog

```sql
SELECT * FROM webhook_events;
```

## Common Issues and Solutions

### Issue: Webhook not firing

**Solution:**
1. Check webhook is active: `SELECT * FROM webhook_endpoints WHERE is_active = TRUE;`
2. Verify event is subscribed: Check `events` array in webhook record
3. Check delivery logs for errors
4. Ensure webhook URL is accessible (HTTPS in production)

### Issue: API key not working

**Solution:**
1. Verify key is active and not expired
2. Check rate limits haven't been exceeded
3. Verify IP is whitelisted (if configured)
4. Ensure correct permissions and scopes

### Issue: OAuth not working

**Solution:**
1. Verify provider is registered and active
2. Check client ID and secret are correct
3. Ensure redirect URI matches registered URI
4. Verify state token is valid (not expired)

## Production Considerations

### Security Checklist

- [ ] Use HTTPS for all webhook URLs
- [ ] Rotate webhook secret keys regularly
- [ ] Set appropriate rate limits for API keys
- [ ] Use IP whitelisting for sensitive API keys
- [ ] Encrypt OAuth tokens in database
- [ ] Implement webhook signature verification
- [ ] Monitor for unusual activity
- [ ] Set up alerts for failed deliveries
- [ ] Regular audit of API key usage

### Performance Tips

- [ ] Create database indexes (already in schema)
- [ ] Implement webhook retry with backoff (already done)
- [ ] Use Redis for rate limiting (optional upgrade)
- [ ] Monitor webhook delivery times
- [ ] Set appropriate timeout values
- [ ] Clean up old delivery logs periodically

## Next Steps

1. Test all integration features in development
2. Set up monitoring and alerts
3. Configure OAuth providers if needed
4. Integrate webhooks with external systems
5. Generate API keys for third-party integrations
6. Review security settings before production

## Support

- API Documentation: http://localhost:5000/api-docs
- Implementation Guide: INTEGRATIONS_IMPLEMENTATION.md
- Database Schema: integrations_schema.sql

For issues or questions, refer to the main documentation or check the integration logs in the database.
