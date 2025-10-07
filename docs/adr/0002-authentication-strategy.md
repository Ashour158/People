# ADR-0002: Authentication Strategy - JWT

## Status

Accepted

## Date

2024-12-07

## Context

The HR Management System requires a secure, scalable authentication mechanism that:

- Supports RESTful API architecture
- Works across distributed services
- Enables stateless authentication
- Supports both web and mobile clients
- Provides secure session management
- Enables fine-grained authorization
- Minimizes database lookups per request

## Decision

We will use **JSON Web Tokens (JWT)** with the following approach:

### Token Strategy

1. **Access Tokens**:
   - Short-lived (24 hours)
   - Contains user identity and permissions
   - Signed with HS256 (HMAC-SHA256)
   - Stored in HTTP-only cookies or Authorization header

2. **Refresh Tokens**:
   - Long-lived (7 days)
   - Used to obtain new access tokens
   - Stored securely in HTTP-only cookies
   - Rotated on each use

### Token Payload

```json
{
  "user_id": "uuid",
  "organization_id": "uuid",
  "email": "user@example.com",
  "role": "admin|hr|manager|employee",
  "permissions": ["read:employees", "write:attendance"],
  "iat": 1234567890,
  "exp": 1234653890
}
```

### Security Measures

1. **Strong Secret**: 256-bit random secret for signing
2. **HTTPS Only**: All tokens transmitted over HTTPS
3. **HTTP-Only Cookies**: Prevents XSS attacks
4. **Token Rotation**: Refresh tokens rotated on use
5. **Blacklisting**: Revoked tokens stored in Redis
6. **Rate Limiting**: Login attempts limited (5 attempts per 15 minutes)
7. **Account Lockout**: After 5 failed attempts for 30 minutes

## Consequences

### Positive

- **Stateless**: No server-side session storage required
- **Scalable**: Works across multiple server instances
- **Performance**: No database lookup per request
- **Flexible**: Easy to add custom claims
- **Standard**: Industry-standard approach
- **Mobile-friendly**: Works well with native apps
- **Microservices-ready**: Can be validated independently

### Negative

- **Token size**: Larger than session IDs (mitigated by compression)
- **Revocation complexity**: Need Redis for token blacklist
- **Secret management**: Must securely manage JWT secret
- **Clock skew**: Servers need synchronized clocks

### Neutral

- **Not database-backed**: User data changes not immediately reflected
- **Token refresh**: Requires refresh token flow

## Alternatives Considered

### Session-Based Authentication

**Pros**:
- Simple to implement
- Easy revocation
- Smaller cookies

**Cons**:
- Requires session storage (Redis/database)
- Not truly stateless
- Harder to scale horizontally
- Session synchronization issues

**Decision**: Rejected due to scalability concerns

### OAuth 2.0 with External Provider

**Pros**:
- Delegate authentication
- Social login support
- Standard protocol

**Cons**:
- Dependency on external service
- Complex implementation
- Not suitable for primary auth (suitable for SSO addition later)

**Decision**: Rejected for primary auth, but may add as SSO option

### Opaque Tokens

**Pros**:
- Smaller tokens
- Easy revocation

**Cons**:
- Requires database lookup per request
- Performance impact
- Not stateless

**Decision**: Rejected due to performance concerns

## Implementation Details

### Libraries

- **Backend**: `jsonwebtoken` (npm)
- **Validation**: JWT signature verification
- **Storage**: Redis for blacklist

### Token Generation

```typescript
import jwt from 'jsonwebtoken';

function generateAccessToken(user: User): string {
  return jwt.sign(
    {
      user_id: user.id,
      organization_id: user.organization_id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}
```

### Token Verification

```typescript
import jwt from 'jsonwebtoken';

function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}
```

### Middleware

```typescript
async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // Check if token is blacklisted
  if (await isTokenBlacklisted(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }
  
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Token Storage

**Web Application**:
```typescript
// Store in HTTP-only cookie
res.cookie('access_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});
```

**Mobile/API Clients**:
```typescript
// Return in response body, client stores securely
res.json({
  access_token: token,
  refresh_token: refreshToken,
  expires_in: 86400,
});
```

### Logout Implementation

```typescript
async function logout(req: Request, res: Response) {
  const token = extractToken(req);
  
  // Blacklist token
  await redis.set(
    `blacklist:${token}`,
    'revoked',
    'EX',
    24 * 60 * 60 // 24 hours
  );
  
  // Clear cookies
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  
  res.json({ message: 'Logged out successfully' });
}
```

## Security Best Practices

1. **Secret Management**:
   - Use environment variables
   - Rotate secrets periodically
   - Use different secrets for dev/staging/prod

2. **Token Expiration**:
   - Short access token lifetime (24h)
   - Reasonable refresh token lifetime (7d)
   - Implement sliding expiration

3. **HTTPS**:
   - Always use HTTPS in production
   - Set `secure: true` for cookies

4. **Token Validation**:
   - Verify signature
   - Check expiration
   - Validate claims
   - Check blacklist

5. **Rate Limiting**:
   - Limit login attempts
   - Limit token refresh attempts
   - Implement progressive delays

## Future Enhancements

- [ ] Add Multi-Factor Authentication (MFA)
- [ ] Implement biometric authentication for mobile
- [ ] Add SSO support (SAML, OAuth)
- [ ] Add device fingerprinting
- [ ] Implement anomaly detection
- [ ] Add passwordless authentication options

## References

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [JWT.io](https://jwt.io/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- Implementation: `backend/src/middleware/auth.ts`

## Review and Approval

- **Author**: HR System Team
- **Reviewers**: Development Team, Security Team
- **Approved**: 2024-12-07
