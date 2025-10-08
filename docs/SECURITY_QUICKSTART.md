# Security Modules Quick Start Guide

This guide will help you get started with the security enhancement modules in the HR Management System.

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

## Installation

1. **Install Dependencies**

```bash
cd backend
npm install
```

2. **Set Environment Variables**

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

**Important**: Set a strong JWT_SECRET (minimum 32 characters):

```env
JWT_SECRET=your_very_strong_secret_key_minimum_32_characters_long_for_production
```

3. **Run Database Migration**

```bash
psql -U postgres -d hr_system -f database/migrations/003_security_modules.sql
```

This will create:
- `audit_logs` table
- `blocked_ips` table
- `security_alerts` table
- `security_settings` table
- Add MFA columns to `users` table
- Add IP whitelist columns to `organizations` table

## Features Overview

### 1. Multi-Factor Authentication (MFA)

Enable 2FA for users using TOTP (compatible with Google Authenticator, Authy, etc.)

**Setup Flow:**
```typescript
// 1. Generate MFA secret
POST /api/v1/security/mfa/setup
Authorization: Bearer <token>

// 2. User scans QR code with authenticator app

// 3. Verify token to enable MFA
POST /api/v1/security/mfa/verify
{
  "token": "123456"
}

// 4. MFA is now enabled!
```

### 2. IP Whitelisting

Restrict access to specific IP addresses or ranges.

**Enable IP Whitelisting:**
```typescript
// 1. Add allowed IPs
POST /api/v1/security/ip-whitelist
{
  "ipAddress": "192.168.1.0/24"  // or single IP: "192.168.1.100"
}

// 2. Enable IP whitelisting
PUT /api/v1/security/ip-whitelist/toggle
{
  "enabled": true
}
```

### 3. Threat Detection

Automatic detection and blocking of suspicious activity.

**Features:**
- SQL injection detection
- XSS attack detection
- Brute force detection
- Rate limiting
- Automatic IP blocking

**How it works:**
- Runs automatically on all requests
- Calculates threat score (0-100)
- Blocks requests with score ≥ 75
- Blocks IP for 24 hours

### 4. Audit Logging

Track all security events and data changes.

**Automatic Logging:**
- All authentication events (login, logout, failed attempts)
- Data access (create, read, update, delete)
- Security events (IP blocked, MFA enabled, etc.)
- Configuration changes

**Query Logs:**
```typescript
GET /api/v1/security/audit-logs?eventType=LOGIN_FAILED&page=1&limit=50
```

### 5. Security Monitoring

Real-time security dashboard and metrics.

**View Dashboard:**
```typescript
GET /api/v1/security/dashboard
```

**Check Vulnerabilities:**
```typescript
GET /api/v1/security/vulnerabilities
```

**Generate Report:**
```typescript
POST /api/v1/security/report
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

## Quick Examples

### Example 1: Enable MFA for All Users

```typescript
// As an admin, enforce MFA for the organization
await query(
  `INSERT INTO security_settings (organization_id, enforce_mfa)
   VALUES ($1, true)
   ON CONFLICT (organization_id) 
   DO UPDATE SET enforce_mfa = true`,
  [organizationId]
);
```

### Example 2: Whitelist Office IP Range

```typescript
// Allow only office network
const response = await fetch('/api/v1/security/ip-whitelist', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ipAddress: '203.0.113.0/24' // Office IP range
  })
});

// Enable whitelisting
await fetch('/api/v1/security/ip-whitelist/toggle', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ enabled: true })
});
```

### Example 3: Encrypt Sensitive Data

```typescript
import { encryptFields, decryptFields } from './utils/encryption';

// Before saving to database
const employee = {
  name: 'John Doe',
  ssn: '123-45-6789',
  salary: '100000',
  bankAccount: '1234567890'
};

const encrypted = encryptFields(employee, ['ssn', 'salary', 'bankAccount']);
await saveToDatabase(encrypted);

// When retrieving from database
const retrieved = await getFromDatabase(employeeId);
const decrypted = decryptFields(retrieved, ['ssn', 'salary', 'bankAccount']);
```

### Example 4: Log Security Event

```typescript
import { logSecurityEvent, AuditEventType, AuditSeverity } from './services/auditLog.service';

// Log a security event
await logSecurityEvent(
  AuditEventType.PASSWORD_CHANGED,
  AuditSeverity.MEDIUM,
  'User changed their password',
  userId,
  organizationId,
  req
);
```

### Example 5: Check Security Dashboard

```typescript
// Get security metrics
const response = await fetch('/api/v1/security/metrics?timeframe=week', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const metrics = await response.json();
console.log(`Failed logins: ${metrics.data.failedLogins}`);
console.log(`Blocked IPs: ${metrics.data.blockedIPs}`);
console.log(`Users with MFA: ${metrics.data.mfaEnabled}`);
```

## Security Best Practices

1. **Always use HTTPS in production**
2. **Set strong JWT_SECRET (32+ characters)**
3. **Enable MFA for admin accounts**
4. **Regularly review audit logs**
5. **Keep blocked IPs list updated**
6. **Monitor security dashboard daily**
7. **Run vulnerability scans weekly**
8. **Backup audit logs regularly**

## Testing

Run the security module tests:

```bash
cd backend
npm test -- security
```

Run all tests:

```bash
npm test
```

## Troubleshooting

### MFA not working?

1. Check time synchronization on server and client
2. Verify secret is stored correctly in database
3. Try using a backup code
4. Check logs for errors

### IP whitelisting blocking legitimate users?

1. Verify IP addresses in whitelist
2. Check if user is behind a proxy/VPN
3. Verify CIDR notation is correct
4. Enable `allow_localhost` for local development

### Threat detection false positives?

1. Check threat score threshold (default: 75)
2. Review detection patterns
3. Whitelist trusted IPs
4. Adjust rate limits if needed

### Audit logs not appearing?

1. Verify database connection
2. Check `enable_audit_logging` setting
3. Review table permissions
4. Check disk space

## Support

- **Documentation**: `/docs/SECURITY_MODULES.md`
- **Issues**: https://github.com/Ashour158/People/issues
- **Security**: security@yourdomain.com

## License

This project is licensed under the MIT License.
