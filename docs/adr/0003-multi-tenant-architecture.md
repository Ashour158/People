# ADR-0003: Multi-tenant Architecture

## Status

Accepted

## Date

2024-12-07

## Context

The HR Management System is designed as a SaaS platform where multiple organizations use the same application instance. We need a multi-tenancy strategy that:

- Ensures complete data isolation between organizations
- Maintains performance with many tenants
- Simplifies deployment and maintenance
- Supports tenant-specific customizations
- Enables cost-effective resource utilization
- Facilitates easy onboarding of new organizations

We need to decide between three main multi-tenancy approaches:

1. **Separate Database per Tenant** - Each organization gets its own database
2. **Separate Schema per Tenant** - All organizations share a database but have separate schemas
3. **Shared Schema with Tenant ID** - All organizations share tables, filtered by organization_id

## Decision

We will use the **Shared Schema with Tenant ID** approach:

- All organizations share the same database and tables
- Every table (except system tables) includes an `organization_id` column
- All queries are automatically filtered by `organization_id`
- Row-level security policies enforce data isolation at the database level

### Implementation Strategy

1. **Database Design**:
   ```sql
   CREATE TABLE employees (
     employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     organization_id UUID NOT NULL REFERENCES organizations(organization_id),
     -- other columns
     CONSTRAINT unique_employee_per_org UNIQUE (organization_id, employee_id)
   );
   
   -- Index for performance
   CREATE INDEX idx_employees_org ON employees(organization_id);
   ```

2. **Application Layer**:
   ```typescript
   // Automatically inject organization_id
   class EmployeeRepository {
     async findAll(organizationId: string): Promise<Employee[]> {
       return await db.query(
         'SELECT * FROM employees WHERE organization_id = $1',
         [organizationId]
       );
     }
   }
   ```

3. **Authentication Layer**:
   - JWT token includes `organization_id`
   - Every request has organization context
   - Middleware validates organization access

4. **API Layer**:
   - Organization ID extracted from authenticated user
   - All queries automatically scoped to organization
   - Cross-organization access strictly prohibited

## Consequences

### Positive

- **Cost-effective**: Optimal resource utilization, single infrastructure
- **Simple deployment**: One codebase, one database
- **Easy maintenance**: Single schema to maintain and migrate
- **Performance**: Single query optimizer, shared caching
- **Scalability**: Easy to scale vertically and horizontally
- **Backup simplicity**: Single backup process
- **Fast onboarding**: New tenant = new row in organizations table
- **Cross-tenant analytics**: Possible when needed (with proper authorization)

### Negative

- **Noisy neighbor**: One tenant can impact others (mitigated with resource limits)
- **Data isolation risk**: Application bugs could leak data (mitigated with RLS)
- **Customization limits**: Schema must work for all tenants
- **Migration complexity**: Schema changes affect all tenants simultaneously
- **Monitoring**: Harder to track per-tenant resource usage

### Neutral

- **Application complexity**: Requires disciplined development
- **Testing**: Need to test multi-tenant scenarios
- **Query patterns**: Always includes WHERE organization_id = ?

## Implementation Details

### Database-Level Isolation

**Row-Level Security (RLS)**:
```sql
-- Enable RLS on all multi-tenant tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY organization_isolation ON employees
  FOR ALL TO app_user
  USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

**Set Organization Context**:
```typescript
async function setOrganizationContext(
  client: PoolClient,
  organizationId: string
): Promise<void> {
  await client.query(
    'SET LOCAL app.current_organization_id = $1',
    [organizationId]
  );
}
```

### Application-Level Enforcement

**Base Repository Pattern**:
```typescript
abstract class BaseRepository<T> {
  protected organizationId: string;
  
  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }
  
  protected addOrgFilter(query: string): string {
    if (!query.includes('WHERE')) {
      return `${query} WHERE organization_id = $1`;
    }
    return query.replace(
      'WHERE',
      `WHERE organization_id = $1 AND`
    );
  }
}
```

**Request Middleware**:
```typescript
async function injectOrganizationContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Get organization from authenticated user
  const organizationId = req.user?.organization_id;
  
  if (!organizationId) {
    return res.status(403).json({ error: 'Organization not found' });
  }
  
  // Store in request context
  req.organizationId = organizationId;
  next();
}
```

### Organization Table Design

```sql
CREATE TABLE organizations (
  organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  
  -- Plan & Limits
  plan_type VARCHAR(50) DEFAULT 'free', -- free, basic, pro, enterprise
  max_employees INTEGER DEFAULT 50,
  max_storage_mb INTEGER DEFAULT 1024,
  
  -- Features
  features JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, suspended, cancelled
  trial_ends_at TIMESTAMP,
  
  -- Billing
  stripe_customer_id VARCHAR(255),
  
  -- Metadata
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX idx_organizations_status ON organizations(status);
```

### Multi-company Support

Within each organization, support multiple companies:

```sql
CREATE TABLE companies (
  company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  
  UNIQUE(organization_id, code),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_org ON companies(organization_id);
```

This enables:
- Multi-company payroll
- Separate legal entities
- Consolidated reporting across companies
- Inter-company transfers

## Alternatives Considered

### Separate Database per Tenant

**Pros**:
- Complete isolation
- Easy to backup per tenant
- Tenant-specific tuning
- No cross-tenant queries

**Cons**:
- High operational overhead (100s of databases)
- Expensive resource usage
- Complex migrations (must run on each DB)
- Difficult to do cross-tenant analytics
- Connection pool management

**Decision**: Rejected due to operational complexity and cost

### Separate Schema per Tenant

**Pros**:
- Good isolation
- Tenant-specific customization
- Easier than separate databases

**Cons**:
- Still complex migrations
- PostgreSQL schema limit considerations
- Connection management overhead
- Query complexity

**Decision**: Rejected as middle-ground with similar complexity

## Security Measures

1. **Defense in Depth**:
   - Application-level filtering
   - Database RLS policies
   - JWT organization validation
   - Audit logging

2. **Testing**:
   - Unit tests verify organization filtering
   - Integration tests cross-organization scenarios
   - Penetration testing for data leakage

3. **Monitoring**:
   - Alert on cross-organization queries
   - Audit log review
   - Anomaly detection

4. **Code Review**:
   - All queries reviewed for organization filtering
   - Automated checks in CI/CD
   - Static analysis tools

## Performance Optimization

1. **Indexing**:
   - All multi-tenant tables have index on organization_id
   - Composite indexes: (organization_id, other_frequently_queried_columns)

2. **Partitioning** (Future):
   - Table partitioning by organization_id for very large tables
   - Hot tenants on separate partitions

3. **Caching**:
   - Cache per organization
   - Cache invalidation scoped to organization

4. **Connection Pooling**:
   - Shared connection pool
   - No per-tenant connections

## Migration Strategy

All schema migrations:
1. Test in development
2. Test in staging (with production-like data)
3. Run during maintenance window
4. Monitor for errors
5. Rollback plan ready

**Zero-downtime migrations**:
- Add columns as nullable
- Backfill data
- Make column non-nullable
- Add constraints

## Monitoring

Track per organization:
- Storage usage
- API call volume
- Active users
- Feature usage
- Performance metrics

Implement quotas:
- Max employees
- Max storage
- API rate limits
- Report generation limits

## Future Enhancements

- [ ] Add table partitioning for large tenants
- [ ] Implement tenant-specific read replicas
- [ ] Add tenant migration tools
- [ ] Implement tenant-specific feature flags
- [ ] Add data residency options (EU, US, etc.)

## References

- [Multi-tenancy SaaS Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/wellarchitected-saas-lens.pdf)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Force.com Multi-tenancy Architecture](https://developer.salesforce.com/page/Multi_Tenant_Architecture)
- Project schema: `enhanced_hr_schema.sql`

## Review and Approval

- **Author**: HR System Team
- **Reviewers**: Development Team, DevOps Team, Security Team
- **Approved**: 2024-12-07
