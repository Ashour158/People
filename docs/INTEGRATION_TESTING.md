# Integration Testing with Live Database

## Overview
This document outlines the integration testing strategy for the HR Management System using live database connections on the staging environment.

## Test Environment Setup

### Database Configuration
**Staging PostgreSQL Database**:
- Host: `staging-db.db.ondigitalocean.com`
- Port: `25060`
- Database: `hr_system_staging`
- User: `doadmin`
- SSL: Required

**Staging Redis Cache**:
- Host: `staging-redis.db.ondigitalocean.com`
- Port: `25061`
- SSL: Required

### Test Data Preparation

#### Initial Seed Data
```sql
-- Organizations
INSERT INTO organizations (organization_id, name, subdomain, status) VALUES
  ('org-test-001', 'Test Organization', 'test-org', 'active');

-- Test Users
INSERT INTO users (user_id, organization_id, email, username, role) VALUES
  ('user-admin-001', 'org-test-001', 'admin@test.com', 'admin', 'admin'),
  ('user-hr-001', 'org-test-001', 'hr@test.com', 'hrmanager', 'hr_manager'),
  ('user-emp-001', 'org-test-001', 'employee@test.com', 'employee1', 'employee');

-- Departments
INSERT INTO departments (department_id, organization_id, name) VALUES
  ('dept-001', 'org-test-001', 'Engineering'),
  ('dept-002', 'org-test-001', 'Human Resources');

-- Employees
INSERT INTO employees (employee_id, organization_id, user_id, first_name, last_name, email, department_id) VALUES
  ('emp-001', 'org-test-001', 'user-emp-001', 'John', 'Doe', 'john.doe@test.com', 'dept-001');
```

## Integration Test Scenarios

### 1. Authentication & Authorization Tests

#### Test 1.1: User Registration and Login Flow
**Purpose**: Verify complete user registration and authentication flow with database

```javascript
describe('Authentication Integration Tests', () => {
  test('Should register new user and store in database', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'newuser@test.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        organizationId: 'org-test-001'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    
    // Verify user exists in database
    const user = await db.query(
      'SELECT * FROM users WHERE email = $1',
      ['newuser@test.com']
    );
    expect(user.rows.length).toBe(1);
  });

  test('Should login and return JWT token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'AdminPass123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeDefined();
    
    // Verify session in Redis
    const session = await redis.get(`session:${response.body.data.user.user_id}`);
    expect(session).toBeDefined();
  });

  test('Should logout and clear session', async () => {
    // Login first
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass123!' });
    
    const token = loginResponse.body.data.token;
    
    // Logout
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    
    // Verify session removed from Redis
    const session = await redis.get(`session:${loginResponse.body.data.user.user_id}`);
    expect(session).toBeNull();
  });
});
```

### 2. Employee Management Tests

#### Test 2.1: CRUD Operations with Database
```javascript
describe('Employee Management Integration Tests', () => {
  let authToken;
  let employeeId;

  beforeAll(async () => {
    // Login as admin
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass123!' });
    authToken = response.body.data.token;
  });

  test('Should create new employee with database persistence', async () => {
    const response = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        departmentId: 'dept-001',
        position: 'Software Engineer',
        startDate: '2024-01-01',
        employmentType: 'full-time'
      });
    
    expect(response.status).toBe(201);
    employeeId = response.body.data.employee_id;
    
    // Verify in database
    const employee = await db.query(
      'SELECT * FROM employees WHERE employee_id = $1',
      [employeeId]
    );
    expect(employee.rows[0].email).toBe('jane.smith@test.com');
  });

  test('Should retrieve employee from database', async () => {
    const response = await request(app)
      .get(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.employee_id).toBe(employeeId);
  });

  test('Should update employee in database', async () => {
    const response = await request(app)
      .put(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        position: 'Senior Software Engineer'
      });
    
    expect(response.status).toBe(200);
    
    // Verify update in database
    const employee = await db.query(
      'SELECT * FROM employees WHERE employee_id = $1',
      [employeeId]
    );
    expect(employee.rows[0].position).toBe('Senior Software Engineer');
  });

  test('Should soft delete employee (not permanently remove)', async () => {
    const response = await request(app)
      .delete(`/api/v1/employees/${employeeId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    
    // Verify soft delete in database
    const employee = await db.query(
      'SELECT * FROM employees WHERE employee_id = $1',
      [employeeId]
    );
    expect(employee.rows[0].is_deleted).toBe(true);
  });
});
```

### 3. Attendance Tracking Tests

#### Test 3.1: Check-in/Check-out with Timestamp Accuracy
```javascript
describe('Attendance Integration Tests', () => {
  let authToken;
  let attendanceId;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@test.com', password: 'EmpPass123!' });
    authToken = response.body.data.token;
  });

  test('Should record check-in with accurate timestamp', async () => {
    const checkInTime = new Date();
    
    const response = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        location: { lat: 40.7128, lng: -74.0060 }
      });
    
    expect(response.status).toBe(201);
    attendanceId = response.body.data.attendance_id;
    
    // Verify in database with timestamp accuracy
    const attendance = await db.query(
      'SELECT * FROM attendance WHERE attendance_id = $1',
      [attendanceId]
    );
    
    const dbCheckIn = new Date(attendance.rows[0].check_in);
    const timeDiff = Math.abs(dbCheckIn - checkInTime);
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
  });

  test('Should record check-out and calculate hours', async () => {
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await request(app)
      .post('/api/v1/attendance/check-out')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        attendanceId: attendanceId
      });
    
    expect(response.status).toBe(200);
    
    // Verify hours calculation in database
    const attendance = await db.query(
      'SELECT * FROM attendance WHERE attendance_id = $1',
      [attendanceId]
    );
    
    expect(attendance.rows[0].check_out).toBeDefined();
    expect(attendance.rows[0].total_hours).toBeGreaterThan(0);
  });
});
```

### 4. Leave Management Tests

#### Test 4.1: Leave Request with Balance Validation
```javascript
describe('Leave Management Integration Tests', () => {
  let authToken;
  let leaveRequestId;

  beforeAll(async () => {
    // Login as employee
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@test.com', password: 'EmpPass123!' });
    authToken = response.body.data.token;
    
    // Ensure employee has leave balance
    await db.query(
      `INSERT INTO leave_balances (employee_id, leave_type_id, balance)
       VALUES ('emp-001', 'annual', 20)
       ON CONFLICT (employee_id, leave_type_id) 
       DO UPDATE SET balance = 20`
    );
  });

  test('Should create leave request and deduct from balance', async () => {
    const response = await request(app)
      .post('/api/v1/leave/apply')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        leaveTypeId: 'annual',
        startDate: '2024-03-01',
        endDate: '2024-03-05',
        reason: 'Vacation'
      });
    
    expect(response.status).toBe(201);
    leaveRequestId = response.body.data.leave_request_id;
    
    // Verify leave request in database
    const leaveRequest = await db.query(
      'SELECT * FROM leave_requests WHERE leave_request_id = $1',
      [leaveRequestId]
    );
    expect(leaveRequest.rows[0].status).toBe('pending');
    expect(leaveRequest.rows[0].total_days).toBe(5);
  });

  test('Should approve leave and update balance', async () => {
    // Login as HR manager
    const hrResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hr@test.com', password: 'HRPass123!' });
    
    const response = await request(app)
      .put(`/api/v1/leave/${leaveRequestId}/approve`)
      .set('Authorization', `Bearer ${hrResponse.body.data.token}`)
      .send({
        comments: 'Approved'
      });
    
    expect(response.status).toBe(200);
    
    // Verify balance deducted
    const balance = await db.query(
      `SELECT balance FROM leave_balances 
       WHERE employee_id = 'emp-001' AND leave_type_id = 'annual'`
    );
    expect(balance.rows[0].balance).toBe(15); // 20 - 5 days
  });

  test('Should prevent leave request exceeding balance', async () => {
    const response = await request(app)
      .post('/api/v1/leave/apply')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        leaveTypeId: 'annual',
        startDate: '2024-04-01',
        endDate: '2024-04-20', // 20 days, but only 15 available
        reason: 'Extended vacation'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('insufficient balance');
  });
});
```

### 5. Transaction and Data Integrity Tests

#### Test 5.1: Database Transaction Rollback
```javascript
describe('Transaction Integrity Tests', () => {
  test('Should rollback on error during employee creation', async () => {
    const initialEmployeeCount = await db.query(
      'SELECT COUNT(*) FROM employees'
    );
    
    // Attempt to create employee with invalid data
    const response = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        firstName: 'Invalid',
        lastName: 'Employee',
        email: 'duplicate@test.com', // Duplicate email
        departmentId: 'invalid-dept' // Invalid department
      });
    
    expect(response.status).toBe(400);
    
    // Verify no employee was created (transaction rolled back)
    const finalEmployeeCount = await db.query(
      'SELECT COUNT(*) FROM employees'
    );
    expect(finalEmployeeCount.rows[0].count).toBe(initialEmployeeCount.rows[0].count);
  });
});
```

### 6. Cache Integration Tests

#### Test 6.1: Redis Cache Hit/Miss
```javascript
describe('Redis Cache Integration Tests', () => {
  test('Should cache employee data in Redis', async () => {
    // First request - cache miss
    const response1 = await request(app)
      .get('/api/v1/employees/emp-001')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response1.status).toBe(200);
    
    // Verify cached in Redis
    const cached = await redis.get('employee:emp-001');
    expect(cached).toBeDefined();
    
    // Second request - cache hit (should be faster)
    const start = Date.now();
    const response2 = await request(app)
      .get('/api/v1/employees/emp-001')
      .set('Authorization', `Bearer ${authToken}`);
    const duration = Date.now() - start;
    
    expect(response2.status).toBe(200);
    expect(duration).toBeLessThan(50); // Should be very fast from cache
  });

  test('Should invalidate cache on employee update', async () => {
    // Update employee
    await request(app)
      .put('/api/v1/employees/emp-001')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ position: 'Updated Position' });
    
    // Verify cache invalidated
    const cached = await redis.get('employee:emp-001');
    expect(cached).toBeNull();
  });
});
```

## Running Integration Tests

### Local Environment
```bash
# Set test environment variables
export NODE_ENV=test
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=hr_system_test
export DB_USER=postgres
export DB_PASSWORD=postgres
export REDIS_HOST=localhost
export REDIS_PORT=6379

# Run integration tests
npm run test:integration
```

### Staging Environment
```bash
# Set staging environment variables
export NODE_ENV=staging
export DB_HOST=staging-db.db.ondigitalocean.com
export DB_PORT=25060
export DB_NAME=hr_system_staging
export DB_USER=doadmin
export DB_PASSWORD=$STAGING_DB_PASSWORD
export REDIS_HOST=staging-redis.db.ondigitalocean.com
export REDIS_PORT=25061
export REDIS_PASSWORD=$STAGING_REDIS_PASSWORD

# Run integration tests against staging
npm run test:integration:staging
```

### CI/CD Pipeline
```yaml
# Already configured in .github/workflows/staging-deployment.yml
integration-tests:
  runs-on: ubuntu-latest
  needs: deploy-staging
  steps:
    - name: Run integration tests against staging
      run: |
        npm run test:integration:staging
      env:
        STAGING_API_URL: https://staging-api.your-domain.com
```

## Test Data Cleanup

After each test run, clean up test data:

```javascript
afterAll(async () => {
  // Clean up test data
  await db.query('DELETE FROM employees WHERE email LIKE \'%@test.com\'');
  await db.query('DELETE FROM leave_requests WHERE employee_id IN (SELECT employee_id FROM employees WHERE email LIKE \'%@test.com\')');
  await db.query('DELETE FROM attendance WHERE employee_id IN (SELECT employee_id FROM employees WHERE email LIKE \'%@test.com\')');
  
  // Clear Redis cache
  await redis.flushdb();
  
  // Close connections
  await db.end();
  await redis.quit();
});
```

## Success Criteria

Integration tests pass when:
- ✅ All database operations succeed
- ✅ Data persists correctly across requests
- ✅ Transactions roll back properly on errors
- ✅ Cache invalidation works correctly
- ✅ Multi-tenant data isolation is maintained
- ✅ Response times are within acceptable limits (<500ms)
- ✅ No memory leaks or connection pool exhaustion

## Monitoring Integration Tests

Track the following metrics:
- Test execution time
- Database query count per test
- Cache hit/miss ratio
- Transaction rollback count
- Failed assertion count

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data after tests
3. **Real Data**: Use realistic test data
4. **Edge Cases**: Test boundary conditions
5. **Performance**: Monitor test execution time
6. **Idempotency**: Tests should produce same results when run multiple times
7. **Transactions**: Use database transactions for test data setup/teardown
8. **Mocking**: Mock external services (email, SMS) but use real database

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: QA Team
