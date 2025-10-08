# Security Implementation Guide

## Overview

This document provides a comprehensive guide to the security features implemented in the People HR Management System. It covers best practices, configuration, and maintenance procedures for system administrators and developers.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Security Middleware](#security-middleware)
5. [Password Security](#password-security)
6. [Security Utilities](#security-utilities)
7. [Security Monitoring](#security-monitoring)
8. [Testing](#testing)
9. [Incident Response](#incident-response)
10. [Maintenance & Updates](#maintenance--updates)

## Security Architecture

### Defense in Depth

The system implements multiple layers of security:

1. **Network Layer**: HTTPS/TLS encryption, rate limiting
2. **Application Layer**: Helmet headers, CORS, input validation
3. **Authentication Layer**: JWT tokens, password hashing
4. **Authorization Layer**: RBAC, multi-tenant isolation
5. **Data Layer**: Parameterized queries, audit logging

### Multi-Tenant Isolation

- Every database query filters by `organization_id`
- User sessions are isolated per organization
- Cross-tenant data access is prevented at the database level

## Authentication & Authorization

### JWT Token Management

#### Token Configuration

```env
JWT_SECRET=your-256-bit-secret-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

**Generate a secure JWT secret:**
```bash
openssl rand -base64 64 | tr -d '\n'
```

#### Token Structure

Access tokens include:
- `userId`: User identifier
- `organizationId`: Organization identifier
- `email`: User email
- `iss`: Issuer (hr-management-system)
- `aud`: Audience (hr-api)
- `exp`: Expiration time

#### Token Verification

The system verifies:
1. Token signature
2. Token expiration
3. Issuer and audience claims
4. User exists and is active
5. User's organization access

### Password Security

#### Requirements

- Minimum 8 characters (12+ recommended)
- Must include:
  - Lowercase letters
  - Uppercase letters
  - Numbers
  - Special characters
- Cannot contain:
  - Common patterns (password, 123456, qwerty)
  - Personal information (username, email, name)
  - Repeated characters (aaa, 111)

#### Password Strength Scoring

Passwords are scored 0-4:
- **0-2**: Weak (rejected)
- **3**: Acceptable
- **4+**: Strong

#### Password Hashing

```typescript
import bcrypt from 'bcryptjs';

// Hash password with 12 rounds (configurable via BCRYPT_ROUNDS)
const hash = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

### Account Lockout

- Maximum login attempts: 5 (configurable via `MAX_LOGIN_ATTEMPTS`)
- Lockout duration: 30 minutes (configurable via `LOCKOUT_DURATION_MINUTES`)
- Lockout tracking by IP address and username
- Automatic unlock after lockout period

## Data Protection

### Encryption

#### In Transit
- All communications via HTTPS/TLS 1.2+
- HSTS headers with 1-year max-age
- TLS certificate validation

#### At Rest
- Database passwords encrypted
- Sensitive configuration in environment variables
- Future: Field-level encryption for PII

### Input Validation

All user inputs are validated using Joi schemas:

```typescript
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});
```

### SQL Injection Prevention

Always use parameterized queries:

```typescript
// ✅ GOOD
const result = await query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ BAD
const result = await query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### XSS Prevention

The system sanitizes all inputs:

```typescript
import { sanitizeInput } from './utils/securityUtils';

const clean = sanitizeInput(userInput);
// Removes: <script>, javascript:, event handlers
```

## Security Middleware

### Helmet Configuration

Comprehensive HTTP security headers:

```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
})
```

### CORS Configuration

Origin validation with whitelist:

```typescript
cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
})
```

Configure allowed origins:
```env
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Rate Limiting

Two-tier rate limiting:

1. **API Endpoints**: 100 requests per 15 minutes per IP
2. **Login Endpoint**: 5 requests per 15 minutes per IP

```typescript
// API rate limiter
apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// Login rate limiter
loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});
```

### Security Logging

Automatic logging of:
- Authentication attempts (success and failure)
- Suspicious patterns (path traversal, XSS, SQL injection)
- Slow requests (potential DoS)
- Failed authorization attempts
- IP addresses and user agents

## Password Security

### Validation Functions

#### Check Password Strength

```typescript
import { validatePasswordStrength } from './utils/passwordSecurity';

const result = validatePasswordStrength('MyP@ssw0rd123');
// Returns: { isValid: true, score: 4, feedback: ['Strong password'] }
```

#### Detect Personal Information

```typescript
import { containsPersonalInfo } from './utils/passwordSecurity';

const hasPersonalInfo = containsPersonalInfo('john123', {
  username: 'john',
  email: 'john@example.com',
});
// Returns: true
```

#### Generate Secure Password

```typescript
import { generateSecurePassword } from './utils/passwordSecurity';

const password = generateSecurePassword(16);
// Returns: e.g., "K9#mL@pQ2!vN7xRz"
```

## Security Utilities

### Token Generation

```typescript
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from './utils/securityUtils';

// Generate tokens
const accessToken = generateAccessToken({
  userId: 'user-id',
  organizationId: 'org-id',
  email: 'user@example.com',
});

const refreshToken = generateRefreshToken({...});

// Verify token
const payload = verifyToken(accessToken);
```

### Secure Random Tokens

```typescript
import {
  generateSecureToken,
  hashToken,
  compareToken,
} from './utils/securityUtils';

// Generate token
const token = generateSecureToken(32); // 64 hex chars

// Hash token for storage
const hash = hashToken(token);

// Compare token with hash
const isValid = compareToken(token, hash);
```

### IP Address Handling

```typescript
import { extractIP, isValidIP } from './utils/securityUtils';

// Extract IP from request (considers proxies)
const ip = extractIP(req);

// Validate IP format
const valid = isValidIP('192.168.1.1'); // true
```

## Security Monitoring

### Audit Logging

All data modifications are logged:
- User who made the change
- Timestamp
- IP address and user agent
- Old and new values
- Entity type and ID

### Log Review

Regular log review for:
- Failed authentication attempts
- Suspicious access patterns
- Slow queries
- Error rates
- Unauthorized access attempts

### Alerts

Set up monitoring for:
- Multiple failed login attempts
- Unusual access patterns
- Error spikes
- Slow response times

## Testing

### Running Security Tests

```bash
# Run all security tests
npm test -- __tests__/utils/securityUtils.test.ts
npm test -- __tests__/utils/passwordSecurity.test.ts
npm test -- __tests__/middleware/securityLogger.test.ts

# Run with coverage
npm test -- __tests__ --coverage
```

### Test Coverage

Current security test coverage:
- Password Security: 19 tests
- Security Utilities: 37 tests
- Security Logger: 7 tests
- **Total: 63 tests**

### Manual Security Testing

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check outdated packages
npm outdated

# Update packages
npm update
```

## Incident Response

### Security Incident Procedure

1. **Detect**: Monitor logs and alerts
2. **Contain**: Disable compromised accounts, block IPs
3. **Investigate**: Review audit logs, identify scope
4. **Eradicate**: Remove malware, patch vulnerabilities
5. **Recover**: Restore from backups if needed
6. **Document**: Record incident details and response

### Account Compromise

If a user account is compromised:

```sql
-- Disable user account
UPDATE users SET is_active = FALSE WHERE user_id = 'compromised-user-id';

-- Invalidate all sessions (implement token blacklist)
-- Force password reset
UPDATE users SET password_reset_required = TRUE WHERE user_id = 'compromised-user-id';
```

### Data Breach

If sensitive data is exposed:
1. Notify affected users within 72 hours
2. Report to relevant authorities (GDPR, etc.)
3. Document the breach
4. Implement additional security measures

## Maintenance & Updates

### Regular Tasks

#### Daily
- Review security logs
- Monitor failed login attempts
- Check system alerts

#### Weekly
- Run `npm audit`
- Review access logs
- Check for unusual patterns

#### Monthly
- Update dependencies
- Review security advisories
- Test backups
- Review user permissions

#### Quarterly
- Security audit
- Penetration testing
- Update security documentation
- Review incident response procedures

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update package.json to latest compatible versions
npm update

# For major version updates
npm install package@latest

# Always test after updates
npm test
npm run build
```

### Security Advisories

Subscribe to:
- [npm Security Advisories](https://www.npmjs.com/advisories)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)
- [GitHub Security Advisories](https://github.com/advisories)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Best Practices Summary

### For Developers

1. ✅ Always use parameterized queries
2. ✅ Validate all inputs with Joi schemas
3. ✅ Never log sensitive data (passwords, tokens)
4. ✅ Use environment variables for secrets
5. ✅ Implement proper error handling
6. ✅ Write security tests for new features
7. ✅ Review code for security issues
8. ✅ Keep dependencies updated

### For System Administrators

1. ✅ Use strong JWT secrets (32+ characters)
2. ✅ Enable HTTPS in production
3. ✅ Configure CORS properly
4. ✅ Set up monitoring and alerting
5. ✅ Regular backup and test restoration
6. ✅ Review logs regularly
7. ✅ Keep system updated
8. ✅ Document security procedures

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

## Support

For security concerns or questions:
- Email: security@yourdomain.com
- Documentation: See [SECURITY.md](./SECURITY.md)
- Bug Reports: GitHub Issues (for non-security bugs only)

**IMPORTANT**: Never report security vulnerabilities publicly. Always use the security email.
