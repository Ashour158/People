# Integration Points - Where to Add Webhook Triggers

This document shows where to add webhook triggers in existing controllers to enable real-time event notifications.

## Employee Controller

Add webhook triggers when employees are created, updated, or deleted:

```typescript
// In backend/src/controllers/employee.controller.ts
import { getWebhookEmitter } from '../utils/webhookEmitter';

export class EmployeeController {
  // After creating employee
  async createEmployee(req: Request, res: Response) {
    const employee = await employeeService.create(data);
    
    // Trigger webhook
    try {
      const webhookEmitter = getWebhookEmitter();
      await webhookEmitter.emitEmployeeCreated(
        employee.organization_id,
        employee
      );
    } catch (error) {
      // Log but don't fail the request
      logger.error('Failed to emit webhook:', error);
    }
    
    return res.json({ success: true, data: employee });
  }

  // After updating employee
  async updateEmployee(req: Request, res: Response) {
    const employee = await employeeService.update(id, data);
    
    // Trigger webhook
    try {
      await getWebhookEmitter().emitEmployeeUpdated(
        employee.organization_id,
        employee
      );
    } catch (error) {
      logger.error('Failed to emit webhook:', error);
    }
    
    return res.json({ success: true, data: employee });
  }

  // After deleting employee
  async deleteEmployee(req: Request, res: Response) {
    await employeeService.delete(id);
    
    // Trigger webhook
    try {
      await getWebhookEmitter().emitEmployeeDeleted(
        organizationId,
        id
      );
    } catch (error) {
      logger.error('Failed to emit webhook:', error);
    }
    
    return res.json({ success: true });
  }
}
```

## Leave Controller

Add webhook triggers for leave requests:

```typescript
// In backend/src/controllers/leave.controller.ts
import { getWebhookEmitter } from '../utils/webhookEmitter';

export class LeaveController {
  // After creating leave request
  async createLeaveRequest(req: Request, res: Response) {
    const leaveRequest = await leaveService.create(data);
    
    // Trigger webhook
    try {
      await getWebhookEmitter().emitLeaveRequested(
        leaveRequest.organization_id,
        leaveRequest
      );
    } catch (error) {
      logger.error('Failed to emit webhook:', error);
    }
    
    return res.json({ success: true, data: leaveRequest });
  }

  // After approving leave
  async approveLeaveRequest(req: Request, res: Response) {
    const leaveRequest = await leaveService.approve(id, approverId);
    
    // Trigger webhook
    try {
      await getWebhookEmitter().emitLeaveApproved(
        leaveRequest.organization_id,
        leaveRequest
      );
    } catch (error) {
      logger.error('Failed to emit webhook:', error);
    }
    
    return res.json({ success: true, data: leaveRequest });
  }

  // After rejecting leave
  async rejectLeaveRequest(req: Request, res: Response) {
    const leaveRequest = await leaveService.reject(id, approverId);
    
    // Trigger webhook
    try {
      await getWebhookEmitter().emitLeaveRejected(
        leaveRequest.organization_id,
        leaveRequest
      );
    } catch (error) {
      logger.error('Failed to emit webhook:', error);
    }
    
    return res.json({ success: true, data: leaveRequest });
  }
}
```

## Attendance Controller

Add webhook triggers for check-in/out:

```typescript
// In backend/src/controllers/attendance.controller.ts
import { getWebhookEmitter } from '../utils/webhookEmitter';

export class AttendanceController {
  // After check-in
  async checkIn(req: Request, res: Response) {
    const attendance = await attendanceService.checkIn(data);
    
    // Trigger webhook
    try {
      await getWebhookEmitter().emitAttendanceCheckIn(
        attendance.organization_id,
        attendance
      );
    } catch (error) {
      logger.error('Failed to emit webhook:', error);
    }
    
    return res.json({ success: true, data: attendance });
  }

  // After check-out
  async checkOut(req: Request, res: Response) {
    const attendance = await attendanceService.checkOut(data);
    
    // Trigger webhook
    try {
      await getWebhookEmitter().emitAttendanceCheckOut(
        attendance.organization_id,
        attendance
      );
    } catch (error) {
      logger.error('Failed to emit webhook:', error);
    }
    
    return res.json({ success: true, data: attendance });
  }
}
```

## Server Initialization

Initialize the webhook emitter in server.ts:

```typescript
// In backend/src/server.ts
import { pool } from './config/database';
import { WebhookEventEmitter } from './utils/webhookEmitter';

// Initialize webhook emitter
WebhookEventEmitter.initialize(pool);

// Rest of server code...
```

## Best Practices

### 1. Always Use Try-Catch

Webhook failures should not break the main functionality:

```typescript
try {
  await getWebhookEmitter().emit(...);
} catch (error) {
  logger.error('Webhook error:', error);
  // Continue processing
}
```

### 2. Emit After Success

Only emit webhooks after the database operation succeeds:

```typescript
// ✅ Good
const employee = await employeeService.create(data);
await getWebhookEmitter().emitEmployeeCreated(...);

// ❌ Bad - might emit for failed operation
await getWebhookEmitter().emitEmployeeCreated(...);
const employee = await employeeService.create(data);
```

### 3. Include Relevant Data

Include enough data in the webhook payload for subscribers to act on it:

```typescript
// ✅ Good - includes full employee object
await webhookEmitter.emitEmployeeCreated(orgId, employee);

// ❌ Bad - only includes ID
await webhookEmitter.emitEmployeeCreated(orgId, { id: employee.id });
```

### 4. Use Descriptive Event Names

Event names should be clear and follow the pattern `resource.action`:

```typescript
// ✅ Good
'employee.created'
'leave.approved'
'attendance.checkin'

// ❌ Bad
'new_employee'
'approved'
'checkin'
```

## Testing Webhooks

### 1. Register a Test Webhook

```bash
curl -X POST http://localhost:5000/api/v1/webhooks \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Test",
    "url": "https://webhook.site/unique-url",
    "events": ["employee.created"]
  }'
```

### 2. Trigger an Event

```bash
curl -X POST http://localhost:5000/api/v1/employees \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com"
  }'
```

### 3. Check Webhook Delivery

Visit webhook.site or check the delivery logs:

```bash
curl http://localhost:5000/api/v1/webhooks/WEBHOOK_ID/deliveries \
  -H "Authorization: Bearer TOKEN"
```

## Adding Custom Events

To add new webhook events:

### 1. Add Event to Database

```sql
INSERT INTO webhook_events (event_type, category, description)
VALUES ('recruitment.candidate_applied', 'recruitment', 'New candidate applied for position');
```

### 2. Add Method to WebhookEventEmitter

```typescript
// In backend/src/utils/webhookEmitter.ts
export class WebhookEventEmitter {
  // ... existing code ...

  async emitCandidateApplied(organizationId: string, candidate: any): Promise<void> {
    return this.emit('recruitment.candidate_applied', organizationId, { candidate });
  }
}
```

### 3. Use in Controller

```typescript
await getWebhookEmitter().emitCandidateApplied(
  organizationId,
  candidateData
);
```

## Monitoring

Monitor webhook health with these queries:

```sql
-- Success rate by webhook
SELECT 
  we.name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE wd.status = 'delivered') as successful,
  ROUND(COUNT(*) FILTER (WHERE wd.status = 'delivered')::numeric / COUNT(*) * 100, 2) as success_rate
FROM webhook_endpoints we
LEFT JOIN webhook_deliveries wd ON we.webhook_id = wd.webhook_id
WHERE wd.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY we.webhook_id, we.name;

-- Failed deliveries requiring attention
SELECT 
  we.name,
  wd.event_type,
  wd.error_message,
  wd.created_at
FROM webhook_deliveries wd
JOIN webhook_endpoints we ON wd.webhook_id = we.webhook_id
WHERE wd.status = 'failed'
  AND wd.attempt_number >= 3
  AND wd.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY wd.created_at DESC;
```

## Troubleshooting

### Webhooks Not Firing

1. Check webhook is active in database
2. Verify event type is subscribed
3. Check server logs for errors
4. Ensure WebhookEventEmitter is initialized

### Deliveries Failing

1. Check webhook URL is accessible
2. Verify timeout is appropriate
3. Check signature verification on receiving end
4. Review error messages in delivery logs

### Performance Issues

1. Webhooks are async and shouldn't block requests
2. Monitor delivery times
3. Consider implementing queue system for high volume
4. Check database indexes on webhook tables
