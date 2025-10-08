# Phase 6 Integrations Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           People HR Management System                        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                        API Gateway Layer                            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │   JWT    │  │ API Key  │  │  OAuth   │  │  CORS    │          │    │
│  │  │   Auth   │  │   Auth   │  │   Flow   │  │  Policy  │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                        Core Application                             │    │
│  │                                                                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │    │
│  │  │  Employee   │  │   Leave     │  │ Attendance  │               │    │
│  │  │  Module     │  │   Module    │  │   Module    │               │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘               │    │
│  │         │                 │                 │                       │    │
│  │         └─────────────────┼─────────────────┘                       │    │
│  │                           │                                          │    │
│  │                  ┌────────▼─────────┐                               │    │
│  │                  │  Webhook Event   │                               │    │
│  │                  │     Emitter      │                               │    │
│  │                  └────────┬─────────┘                               │    │
│  └────────────────────────────┼───────────────────────────────────────┘    │
│                                │                                             │
│  ┌────────────────────────────▼───────────────────────────────────────┐    │
│  │                   Integration Services Layer                        │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │    │
│  │  │   Webhook    │  │    OAuth     │  │   API Key    │            │    │
│  │  │   Service    │  │   Service    │  │   Service    │            │    │
│  │  │              │  │              │  │              │            │    │
│  │  │ • Delivery   │  │ • Provider   │  │ • Generation │            │    │
│  │  │ • Retry      │  │ • Token Mgmt │  │ • Validation │            │    │
│  │  │ • Signature  │  │ • User Info  │  │ • Rate Limit │            │    │
│  │  │ • Logging    │  │ • Refresh    │  │ • Analytics  │            │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │    │
│  └─────────┼──────────────────┼──────────────────┼────────────────────┘    │
│            │                  │                  │                          │
└────────────┼──────────────────┼──────────────────┼──────────────────────────┘
             │                  │                  │
             │                  │                  │
    ┌────────▼─────┐   ┌────────▼────────┐  ┌─────▼──────┐
    │   Database   │   │  OAuth Provider │  │ Rate Limit │
    │              │   │                 │  │   Store    │
    │ • Webhooks   │   │  • Google       │  │            │
    │ • OAuth      │   │  • Microsoft    │  │ • Redis    │
    │ • API Keys   │   │  • GitHub       │  │ • Memory   │
    │ • Logs       │   │  • LinkedIn     │  │            │
    └──────────────┘   └─────────────────┘  └────────────┘

External Systems
━━━━━━━━━━━━━━━━

    ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
    │   Webhook    │         │   OAuth      │         │   API Key    │
    │  Consumers   │         │    Apps      │         │   Clients    │
    │              │         │              │         │              │
    │ • Slack      │         │ • Web App    │         │ • Mobile App │
    │ • Teams      │         │ • Mobile App │         │ • External   │
    │ • Custom     │         │ • Desktop    │         │   Systems    │
    │   Systems    │         │              │         │              │
    └──────────────┘         └──────────────┘         └──────────────┘
         ▲                        ▲                        ▲
         │                        │                        │
    ┌────┴─────┐             ┌────┴─────┐            ┌────┴─────┐
    │ Webhook  │             │  OAuth   │            │ API Key  │
    │ Events   │             │  Tokens  │            │ Requests │
    └──────────┘             └──────────┘            └──────────┘
```

## Data Flow Diagrams

### 1. Webhook Event Flow

```
Employee Created
      │
      ▼
┌─────────────┐
│  Employee   │
│ Controller  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Webhook    │
│  Emitter    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Webhook    │
│  Service    │
└──────┬──────┘
       │
       ├───────────────────────────┐
       │                           │
       ▼                           ▼
┌─────────────┐            ┌─────────────┐
│   Find      │            │   Create    │
│  Subscribed │            │  Delivery   │
│  Webhooks   │            │   Record    │
└──────┬──────┘            └──────┬──────┘
       │                           │
       ▼                           ▼
┌─────────────┐            ┌─────────────┐
│  Generate   │            │   Send      │
│  Signature  │            │   HTTP      │
└──────┬──────┘            │   Request   │
       │                   └──────┬──────┘
       │                          │
       └──────────┬───────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Success?      │
         └────┬───────┬───┘
              │       │
          Yes │       │ No
              │       │
              ▼       ▼
    ┌─────────────┐ ┌─────────────┐
    │   Mark      │ │  Schedule   │
    │ Delivered   │ │   Retry     │
    └─────────────┘ └─────────────┘
```

### 2. OAuth Flow

```
User Clicks Login
      │
      ▼
┌─────────────┐
│   OAuth     │
│ Controller  │
│ /authorize  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Generate   │
│   State     │
│   Token     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   Redirect User     │
│   to Provider       │
│   (Google, etc.)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   User Authorizes   │
│   on Provider Site  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Provider          │
│   Redirects Back    │
│   with Code         │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│   OAuth     │
│ Controller  │
│ /callback   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Verify     │
│   State     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Exchange   │
│  Code for   │
│   Tokens    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Get User  │
│    Info     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Store     │
│   Tokens    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Return    │
│   Success   │
└─────────────┘
```

### 3. API Key Authentication Flow

```
API Request with X-API-Key
      │
      ▼
┌─────────────┐
│  API Key    │
│  Middleware │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Extract    │
│  API Key    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Validate   │
│  API Key    │
│  (bcrypt)   │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
   Valid?         Invalid
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│  Check IP   │  │   Return    │
│  Whitelist  │  │   401       │
└──────┬──────┘  └─────────────┘
       │
       ▼
┌─────────────┐
│  Check      │
│  Rate Limit │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
  Allowed?       Exceeded
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│   Check     │  │   Return    │
│ Permissions │  │   429       │
└──────┬──────┘  └─────────────┘
       │
       ▼
┌─────────────┐
│   Allow     │
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Log       │
│   Usage     │
└─────────────┘
```

## Database Schema Relationships

```
┌──────────────────┐
│  organizations   │
└────────┬─────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│ webhook_endpoints│              │  oauth_providers │
└────────┬─────────┘              └────────┬─────────┘
         │                                 │
         │ 1:N                             │ 1:N
         │                                 │
         ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│webhook_deliveries│              │  oauth_tokens    │
└──────────────────┘              └──────────────────┘

         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│    api_keys      │              │ integration_logs │
└────────┬─────────┘              └──────────────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────┐
│  api_key_usage   │
└──────────────────┘
```

## Component Responsibilities

### Services Layer

**WebhookService**
- Register/manage webhook endpoints
- Deliver webhooks with retry logic
- Generate HMAC signatures
- Track deliveries and logs

**OAuthService**
- Manage OAuth providers
- Handle authorization flow
- Exchange codes for tokens
- Refresh expired tokens
- Fetch user information

**ApiKeyService**
- Generate secure API keys
- Validate API keys
- Manage rate limits
- Track usage statistics
- Handle revocation

### Middleware Layer

**apiKeyAuth**
- Extract API key from header
- Validate API key
- Check IP whitelist
- Enforce rate limits
- Check permissions/scopes
- Log usage

### Utilities

**WebhookEventEmitter**
- Global event emitter
- Type-safe event methods
- Async/non-blocking
- Error handling
- Singleton pattern

## Security Layers

```
┌─────────────────────────────────────────┐
│           Security Layers               │
│                                         │
│  1. HTTPS/TLS Transport                │
│     └─ All traffic encrypted            │
│                                         │
│  2. Authentication                      │
│     ├─ JWT Bearer Tokens               │
│     ├─ API Keys (bcrypt)               │
│     └─ OAuth 2.0                       │
│                                         │
│  3. Authorization                       │
│     ├─ Role-based Access Control       │
│     ├─ Permission Checks               │
│     └─ Scope Validation                │
│                                         │
│  4. Rate Limiting                       │
│     ├─ Per-key limits                  │
│     ├─ Per-endpoint limits             │
│     └─ Global limits                   │
│                                         │
│  5. Input Validation                    │
│     ├─ Schema validation (Joi)         │
│     ├─ Sanitization                    │
│     └─ Type checking                   │
│                                         │
│  6. Webhook Security                    │
│     ├─ HMAC-SHA256 signatures          │
│     ├─ HTTPS only                      │
│     └─ Secret per webhook              │
│                                         │
│  7. Audit Logging                       │
│     ├─ All API calls logged            │
│     ├─ Integration events logged       │
│     └─ Security events logged          │
│                                         │
└─────────────────────────────────────────┘
```

## Performance Considerations

```
┌─────────────────────────────────────────┐
│       Performance Optimizations         │
│                                         │
│  Database:                              │
│  • Indexes on all FKs                  │
│  • Indexes on query columns            │
│  • Connection pooling                   │
│                                         │
│  Webhooks:                              │
│  • Async delivery (non-blocking)       │
│  • Configurable timeout                 │
│  • Exponential backoff                  │
│                                         │
│  API Keys:                              │
│  • Fast bcrypt validation              │
│  • Cached rate limits                   │
│  • Minimal DB queries                   │
│                                         │
│  OAuth:                                 │
│  • Token caching                        │
│  • Automatic refresh                    │
│  • Minimal provider calls               │
│                                         │
└─────────────────────────────────────────┘
```

## Monitoring Points

```
┌─────────────────────────────────────────┐
│           Monitoring Metrics            │
│                                         │
│  Webhooks:                              │
│  • Delivery success rate               │
│  • Retry counts                         │
│  • Response times                       │
│  • Failed deliveries                    │
│                                         │
│  API Keys:                              │
│  • Request counts                       │
│  • Rate limit hits                      │
│  • Error rates                          │
│  • Response times                       │
│                                         │
│  OAuth:                                 │
│  • Token refresh rate                   │
│  • Failed authentications               │
│  • Provider response times              │
│                                         │
│  System:                                │
│  • Database connections                 │
│  • Memory usage                         │
│  • CPU usage                            │
│  • Request throughput                   │
│                                         │
└─────────────────────────────────────────┘
```
