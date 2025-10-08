# Security Modules Documentation

## Overview

This document describes the security enhancement modules implemented in the HR Management System. These modules provide enterprise-grade security features including Multi-Factor Authentication (MFA), IP whitelisting, advanced audit logging, threat detection, and security monitoring.

## Table of Contents

1. [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
2. [IP Whitelisting](#ip-whitelisting)
3. [Advanced Audit Logging](#advanced-audit-logging)
4. [Threat Detection](#threat-detection)
5. [Security Monitoring](#security-monitoring)
6. [Data Encryption](#data-encryption)
7. [API Reference](#api-reference)
8. [Configuration](#configuration)

---

## Multi-Factor Authentication (MFA)

### Overview

Time-based One-Time Password (TOTP) authentication using industry-standard algorithms (RFC 6238). Compatible with Google Authenticator, Authy, and other TOTP apps.

### Features

- **TOTP-based 2FA**: Uses 6-digit codes that rotate every 30 seconds
- **QR Code Setup**: Easy setup by scanning QR code with authenticator app
- **Backup Codes**: 10 one-time-use backup codes for recovery
- **Grace Period**: 2-step time window to account for clock skew

### Setup Flow

1. User initiates MFA setup
2. System generates a secret key and QR code
3. User scans QR code with authenticator app
4. User enters verification code to confirm setup
5. System provides backup codes for safe storage
6. MFA is enabled for the user

### API Endpoints

#### Generate MFA Secret
```http
POST /api/v1/security/mfa/setup
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "secret": "BASE32_ENCODED_SECRET",
    "qrCodeUrl": "data:image/png;base64,...",
    "backupCodes": [
      "ABCD-1234",
      "EFGH-5678",
      ...
    ]
  }
}
```

#### Verify and Enable MFA
```http
POST /api/v1/security/mfa/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}

Response:
{
  "success": true,
  "message": "MFA enabled successfully"
}
```

#### Get MFA Status
```http
GET /api/v1/security/mfa/status
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "enabled": true,
    "verified": true
  }
}
```

#### Disable MFA
```http
POST /api/v1/security/mfa/disable
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "MFA disabled successfully"
}
```

#### Regenerate Backup Codes
```http
POST /api/v1/security/mfa/backup-codes
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "backupCodes": [
      "WXYZ-9876",
      "LMNO-5432",
      ...
    ]
  }
}
```

### Login Flow with MFA

When MFA is enabled:

1. User provides email and password
2. If credentials are valid and MFA is enabled, return `mfa_required: true`
3. User provides MFA token (6-digit code or backup code)
4. System verifies token and issues JWT if valid

### Database Schema

```sql
-- Added to users table
mfa_enabled BOOLEAN DEFAULT FALSE
mfa_verified BOOLEAN DEFAULT FALSE
mfa_secret TEXT
mfa_backup_codes TEXT[]
```

---

## IP Whitelisting

### Overview

Restricts access to the system based on IP addresses. Supports both individual IPs and CIDR notation for IP ranges.

### Features

- **Individual IPs**: `192.168.1.100`
- **CIDR Ranges**: `192.168.1.0/24`
- **Localhost Exception**: Optionally allow localhost (127.0.0.1)
- **Organization-Level**: Different whitelist per organization

### Use Cases

- Remote work policies
- Office network restrictions
- VPN-only access
- Regional restrictions

### API Endpoints

#### Get IP Whitelist Settings
```http
GET /api/v1/security/ip-whitelist
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN

Response:
{
  "success": true,
  "data": {
    "enable_ip_whitelist": true,
    "allowed_ips": [
      "192.168.1.0/24",
      "10.0.0.100"
    ],
    "allow_localhost": true
  }
}
```

#### Add IP to Whitelist
```http
POST /api/v1/security/ip-whitelist
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN
Content-Type: application/json

{
  "ipAddress": "192.168.1.100"
}

Response:
{
  "success": true,
  "message": "IP address added to whitelist"
}
```

#### Remove IP from Whitelist
```http
DELETE /api/v1/security/ip-whitelist/192.168.1.100
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN

Response:
{
  "success": true,
  "message": "IP address removed from whitelist"
}
```

#### Enable/Disable IP Whitelisting
```http
PUT /api/v1/security/ip-whitelist/toggle
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN
Content-Type: application/json

{
  "enabled": true
}

Response:
{
  "success": true,
  "message": "IP whitelisting enabled"
}
```

### Database Schema

```sql
-- Added to organizations table
enable_ip_whitelist BOOLEAN DEFAULT FALSE
allowed_ips TEXT[] DEFAULT '{}'
allow_localhost BOOLEAN DEFAULT TRUE
```

---

## Advanced Audit Logging

### Overview

Comprehensive logging of all security events, data access, and user actions for compliance and forensics.

### Event Types

#### Authentication Events
- `LOGIN` - Successful login
- `LOGOUT` - User logout
- `LOGIN_FAILED` - Failed login attempt
- `PASSWORD_CHANGED` - Password changed
- `PASSWORD_RESET` - Password reset
- `MFA_ENABLED` - MFA enabled
- `MFA_DISABLED` - MFA disabled
- `MFA_VERIFIED` - MFA token verified

#### Authorization Events
- `ACCESS_DENIED` - Permission denied
- `PERMISSION_GRANTED` - Permission granted
- `PERMISSION_REVOKED` - Permission revoked

#### Data Events
- `DATA_CREATED` - Record created
- `DATA_UPDATED` - Record updated
- `DATA_DELETED` - Record deleted
- `DATA_VIEWED` - Data accessed/viewed
- `DATA_EXPORTED` - Data exported

#### Security Events
- `SUSPICIOUS_ACTIVITY` - Suspicious activity detected
- `IP_BLOCKED` - IP address blocked
- `ACCOUNT_LOCKED` - Account locked
- `ACCOUNT_UNLOCKED` - Account unlocked
- `TOKEN_EXPIRED` - Token expired
- `TOKEN_REVOKED` - Token revoked

### Severity Levels

- `LOW` - Normal operations
- `MEDIUM` - Noteworthy events
- `HIGH` - Important security events
- `CRITICAL` - Critical security incidents (triggers alerts)

### API Endpoints

#### Get Audit Logs
```http
GET /api/v1/security/audit-logs
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN

Query Parameters:
- eventType: Filter by event type
- severity: Filter by severity
- userId: Filter by user
- startDate: Start of date range
- endDate: End of date range
- page: Page number
- limit: Results per page

Response:
{
  "success": true,
  "data": {
    "logs": [...],
    "total": 150,
    "page": 1,
    "limit": 50
  }
}
```

### Usage in Code

```typescript
import { logAuditEvent, AuditEventType, AuditSeverity } from './services/auditLog.service';

// Log a data access event
await logAuditEvent({
  eventType: AuditEventType.DATA_VIEWED,
  severity: AuditSeverity.LOW,
  userId: req.user.user_id,
  organizationId: req.user.organization_id,
  targetResource: 'employees',
  targetResourceId: employeeId,
  action: 'VIEW',
  description: 'User viewed employee record',
}, req);

// Log a security event
await logSecurityEvent(
  AuditEventType.SUSPICIOUS_ACTIVITY,
  AuditSeverity.CRITICAL,
  'Multiple failed login attempts detected',
  userId,
  organizationId,
  req,
  { attemptCount: 5, ipAddress: '192.168.1.100' }
);
```

### Retention Policy

- Default retention: 365 days
- Automatic cleanup via scheduled job
- Configurable per organization

### Database Schema

```sql
CREATE TABLE audit_logs (
  audit_log_id UUID PRIMARY KEY,
  organization_id UUID,
  user_id UUID,
  event_type VARCHAR(100),
  severity VARCHAR(20),
  target_user_id UUID,
  target_resource VARCHAR(100),
  target_resource_id VARCHAR(255),
  action VARCHAR(100),
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  changes JSONB,
  created_at TIMESTAMP
);
```

---

## Threat Detection

### Overview

Real-time detection and blocking of suspicious activity patterns including brute force attacks, SQL injection attempts, XSS attacks, and abnormal behavior.

### Detection Patterns

#### Rate-Based Detection
- **Request Rate**: > 60 requests/minute (+30 points)
- **Failed Logins**: > 5 failed logins/hour (+40 points)
- **IP Changes**: > 5 IPs per user (+25 points)

#### Pattern-Based Detection
- **SQL Injection**: Detects SQL injection patterns (+50 points)
- **XSS Attacks**: Detects script injection attempts (+50 points)
- **Path Traversal**: Detects `../` patterns (+50 points)
- **Code Execution**: Detects `exec`, `eval` patterns (+50 points)

#### Behavioral Detection
- **Missing User-Agent**: No or suspicious User-Agent (+15 points)
- **Suspicious Headers**: Known attack headers (+10 points)

### Threat Score Calculation

Each request is assigned a threat score (0-100). If score ≥ 75, the request is blocked and IP is added to block list.

### Automatic Blocking

When suspicious activity is detected:
1. Request is blocked with 403 status
2. IP is added to block list (24-hour expiry)
3. Security event is logged
4. Critical alert is generated

### API Endpoints

#### Get Blocked IPs
```http
GET /api/v1/security/blocked-ips
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN

Response:
{
  "success": true,
  "data": [
    {
      "ip_address": "192.168.1.100",
      "reason": "Multiple failed login attempts",
      "blocked_at": "2024-01-01T12:00:00Z",
      "expires_at": "2024-01-02T12:00:00Z"
    }
  ]
}
```

#### Unblock IP
```http
DELETE /api/v1/security/blocked-ips/192.168.1.100
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN

Response:
{
  "success": true,
  "message": "IP address unblocked"
}
```

### Configuration

```typescript
const THREAT_CONFIG = {
  maxRequestsPerMinute: 60,
  maxFailedLoginsPerHour: 5,
  maxIPsPerUser: 5,
  threatScoreThreshold: 75,
};
```

### Database Schema

```sql
CREATE TABLE blocked_ips (
  blocked_ip_id UUID PRIMARY KEY,
  ip_address VARCHAR(45) UNIQUE,
  reason TEXT,
  blocked_by UUID,
  blocked_at TIMESTAMP,
  expires_at TIMESTAMP,
  unblocked_at TIMESTAMP,
  unblocked_by UUID
);
```

---

## Security Monitoring

### Overview

Real-time security metrics, dashboards, and reports for monitoring the security posture of the organization.

### Metrics

- **Failed Logins**: Count of failed login attempts
- **Suspicious Activity**: Count of threat detection events
- **Blocked IPs**: Count of currently blocked IPs
- **Active Sessions**: Count of active user sessions
- **MFA Enabled**: Count of users with MFA enabled
- **Recent Alerts**: Latest critical security alerts

### API Endpoints

#### Security Dashboard
```http
GET /api/v1/security/dashboard
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN

Response:
{
  "success": true,
  "data": {
    "metrics": {
      "daily": { ... },
      "weekly": { ... },
      "monthly": { ... }
    },
    "trends": {
      "loginFailures": [...]
    },
    "riskyUsers": [...]
  }
}
```

#### Security Metrics
```http
GET /api/v1/security/metrics?timeframe=week
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN

Response:
{
  "success": true,
  "data": {
    "failedLogins": 25,
    "suspiciousActivity": 3,
    "blockedIPs": 5,
    "activeSessions": 42,
    "mfaEnabled": 85,
    "recentAlerts": [...],
    "vulnerabilityCount": 2
  }
}
```

#### Vulnerability Check
```http
GET /api/v1/security/vulnerabilities
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN

Response:
{
  "success": true,
  "data": [
    {
      "type": "MFA_NOT_ENABLED",
      "severity": "HIGH",
      "description": "15 users do not have MFA enabled",
      "recommendation": "Enable MFA for all users"
    },
    {
      "type": "WEAK_PASSWORD_POLICY",
      "severity": "MEDIUM",
      "description": "Password minimum length is less than 12 characters",
      "recommendation": "Set minimum password length to at least 12 characters"
    }
  ]
}
```

#### Generate Security Report
```http
POST /api/v1/security/report
Authorization: Bearer <token>
Permissions: ADMIN, SECURITY_ADMIN
Content-Type: application/json

{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}

Response:
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "totalEvents": 5420,
    "eventTypeCounts": { ... },
    "severityCounts": { ... },
    "topActiveUsers": [...],
    "vulnerabilities": [...]
  }
}
```

---

## Data Encryption

### Overview

Field-level encryption for sensitive data using AES-256-GCM authenticated encryption.

### Usage

```typescript
import { encrypt, decrypt, encryptFields, decryptFields } from './utils/encryption';

// Encrypt a single value
const encrypted = encrypt('sensitive data');

// Decrypt a single value
const decrypted = decrypt(encrypted);

// Encrypt multiple fields
const user = {
  name: 'John Doe',
  ssn: '123-45-6789',
  salary: '100000'
};
const encryptedUser = encryptFields(user, ['ssn', 'salary']);

// Decrypt multiple fields
const decryptedUser = decryptFields(encryptedUser, ['ssn', 'salary']);
```

### Features

- **AES-256-GCM**: Industry-standard authenticated encryption
- **Random IV**: Unique initialization vector per encryption
- **Authentication Tag**: Prevents tampering
- **Key Derivation**: Uses PBKDF2 with 100,000 iterations

### Best Practices

1. Encrypt PII data: SSN, salary, bank account numbers
2. Encrypt in application layer, not database
3. Keep encryption keys secure
4. Rotate encryption keys periodically
5. Never log encrypted data

---

## Configuration

### Environment Variables

```env
# JWT (used for encryption key derivation)
JWT_SECRET=your-very-strong-secret-key-min-32-chars

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
```

### Organization Settings

```sql
-- Security settings per organization
INSERT INTO security_settings (
  organization_id,
  enforce_mfa,
  session_timeout_minutes,
  enable_threat_detection,
  threat_score_threshold,
  audit_retention_days
) VALUES (
  'org-uuid',
  true,
  1440,
  true,
  75,
  365
);
```

### Feature Flags

- `enforce_mfa`: Require all users to enable MFA
- `enable_ip_whitelist`: Enable IP whitelisting
- `enable_threat_detection`: Enable threat detection middleware
- `enable_audit_logging`: Enable comprehensive audit logging

---

## Testing

### Unit Tests

```typescript
describe('MFA Service', () => {
  it('should generate MFA secret', async () => {
    const result = await generateMFASecret(userId, email);
    expect(result.secret).toBeDefined();
    expect(result.qrCodeUrl).toContain('data:image');
    expect(result.backupCodes).toHaveLength(10);
  });

  it('should verify MFA token', async () => {
    const verified = await verifyMFAToken(userId, '123456');
    expect(verified).toBe(true);
  });
});

describe('Threat Detection', () => {
  it('should block suspicious activity', async () => {
    // Simulate high threat score
    const score = calculateThreatScore(req);
    expect(score).toBeGreaterThan(75);
  });
});
```

### Integration Tests

Test security endpoints with actual HTTP requests and database operations.

---

## Security Best Practices

1. **Always Use HTTPS**: Encrypt data in transit
2. **Rotate Secrets**: Change JWT secrets and encryption keys regularly
3. **Monitor Alerts**: Set up alerts for critical security events
4. **Regular Audits**: Review audit logs regularly
5. **MFA Enforcement**: Require MFA for privileged accounts
6. **IP Whitelisting**: Use for sensitive operations
7. **Rate Limiting**: Prevent brute force attacks
8. **Input Validation**: Validate all user inputs
9. **Least Privilege**: Grant minimum necessary permissions
10. **Security Updates**: Keep dependencies up to date

---

## Troubleshooting

### MFA Issues

**Problem**: QR code not scanning
- Solution: Verify QR code is displayed correctly, try manual entry of secret key

**Problem**: Token not verifying
- Solution: Check time synchronization, verify 6-digit code, try backup code

### IP Whitelisting Issues

**Problem**: Legitimate users blocked
- Solution: Check IP whitelist, verify user's IP, check CIDR ranges

**Problem**: Localhost not working
- Solution: Verify `allow_localhost` is true

### Audit Log Issues

**Problem**: Logs not appearing
- Solution: Check `enable_audit_logging` setting, verify database connection

**Problem**: Too many logs
- Solution: Adjust retention policy, increase storage

### Threat Detection Issues

**Problem**: False positives
- Solution: Adjust threat score threshold, whitelist trusted IPs

**Problem**: Legitimate IPs blocked
- Solution: Unblock IP via API, adjust detection rules

---

## Support

For security issues, please follow responsible disclosure:
1. **Do not** create public GitHub issues
2. Email: security@yourdomain.com
3. Include full details and reproduction steps
4. Wait for response before public disclosure

For general support:
- GitHub Issues: https://github.com/Ashour158/People/issues
- Documentation: https://github.com/Ashour158/People/docs

---

**Last Updated**: January 2025
**Version**: 1.0.0
