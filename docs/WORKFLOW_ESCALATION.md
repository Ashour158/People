# Workflow Approval Escalation Automation

## Overview

This feature automates the escalation and reminder process for workflow approvals using background jobs. It ensures timely processing of approvals by monitoring SLA compliance and automatically escalating overdue tasks.

## Features

### 1. Automated SLA Monitoring
- Continuously scans pending workflow instances
- Checks elapsed time against defined SLA thresholds
- Identifies workflows approaching or exceeding SLA deadlines

### 2. Escalation Triggers
- **SLA Warning**: Sends reminder when approaching SLA deadline (2 hours before)
- **SLA Breach**: Automatically escalates to designated authority when SLA is exceeded

### 3. Notification System
- Sends notifications to:
  - Current approvers (SLA warnings)
  - Escalation targets (when breached)
  - Initiators (status updates)

### 4. Audit Trail
- Records all escalation events
- Tracks SLA breach history
- Maintains comprehensive audit logs

### 5. Metrics & Monitoring
- Exports Prometheus metrics for monitoring
- Tracks key performance indicators:
  - `workflow_tasks_checked_total` - Total workflows checked
  - `workflow_tasks_escalated_total` - Workflows escalated
  - `workflow_tasks_reminded_total` - Reminders sent
  - `workflow_tasks_over_sla_total` - SLA breaches
  - `workflow_escalation_duration_seconds` - Processing time

## Architecture

### Components

#### 1. WorkflowEscalationService
**Location**: `app/services/workflow_escalation_service.py`

Main service class that handles:
- SLA status checking
- Workflow escalation logic
- Notification dispatch
- Audit log creation
- Metrics export

**Key Methods**:
- `check_and_escalate_workflows()` - Main escalation check function
- `_check_sla_status()` - Evaluates SLA compliance
- `_escalate_workflow()` - Performs escalation
- `_send_sla_warning()` - Sends SLA warnings

#### 2. Celery Background Tasks
**Location**: `app/tasks/workflow_tasks.py`

Background tasks for async processing:
- `check_workflow_escalations_task` - Scheduled escalation check
- `send_escalation_reminder_task` - Individual reminder task

#### 3. Scheduler Integration
**Location**: `app/services/scheduler_service.py`

Integration with the scheduler service:
- Runs escalation check every 15 minutes
- Configurable via Celery Beat schedule

#### 4. Metrics Exporter
**Location**: `app/utils/workflow_metrics.py`

Prometheus metrics for monitoring:
- Counter metrics for events
- Histogram for duration tracking
- Gauge for current state

#### 5. Metrics API
**Location**: `app/api/v1/endpoints/metrics.py`

REST endpoints for metrics:
- `/api/v1/metrics/workflow-escalations` - JSON metrics
- `/api/v1/metrics/prometheus` - Prometheus format

## Configuration

### SLA Thresholds

Configure in `WorkflowEscalationService`:
```python
self.sla_warning_threshold_hours = 2  # Warn 2 hours before SLA
self.escalation_retry_hours = 24      # Re-escalate after 24 hours
```

### Celery Beat Schedule

Configured in `app/services/scheduler_service.py`:
```python
'check-workflow-escalations': {
    'task': 'tasks.check_workflow_escalations',
    'schedule': crontab(minute='*/15'),  # Every 15 minutes
}
```

### Task Queues

Workflow tasks use dedicated queue:
```python
"tasks.check_workflow_escalations": {"queue": "workflows"}
```

## Usage

### Running the Escalation Job

#### Automatic (via Celery Beat)
The job runs automatically every 15 minutes when Celery Beat is running:

```bash
# Start Celery worker
celery -A app.celery_app worker --loglevel=info -Q workflows

# Start Celery Beat scheduler
celery -A app.celery_app beat --loglevel=info
```

#### Manual Trigger
You can manually trigger escalation check:

```python
from app.services.workflow_escalation_service import workflow_escalation_service

# Async context
result = await workflow_escalation_service.check_and_escalate_workflows()

# Via Celery task
from app.tasks.workflow_tasks import check_workflow_escalations_task
result = check_workflow_escalations_task.delay()
```

### Monitoring Metrics

#### JSON Format
```bash
curl http://localhost:5000/api/v1/metrics/workflow-escalations
```

Response:
```json
{
  "success": true,
  "data": {
    "workflows_checked": 150,
    "workflows_escalated": 12,
    "reminders_sent": 28,
    "sla_breaches": 12,
    "escalation_failures": 0
  }
}
```

#### Prometheus Format
```bash
curl http://localhost:5000/api/v1/metrics/prometheus
```

Configure Prometheus to scrape this endpoint:
```yaml
scrape_configs:
  - job_name: 'hr_workflows'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/api/v1/metrics/prometheus'
```

## Workflow Definition

When creating workflows, define SLA and escalation settings:

```python
workflow_stage = {
    "stage_name": "Manager Approval",
    "stage_order": 1,
    "approver_type": "manager",
    "sla_hours": 24,                    # SLA deadline in hours
    "escalation_enabled": True,         # Enable auto-escalation
    "escalation_after_hours": 48,       # Escalate after 48 hours
    "escalation_to": "department_head"  # Escalation target
}
```

## Event Flow

### 1. SLA Warning Flow
```
Workflow Pending (22h elapsed, 24h SLA)
  ↓
Escalation Job Runs
  ↓
SLA Status: "warning"
  ↓
Send Reminder to Current Approver
  ↓
Create Audit Log Entry
  ↓
Export Metrics
```

### 2. Escalation Flow
```
Workflow Pending (26h elapsed, 24h SLA)
  ↓
Escalation Job Runs
  ↓
SLA Status: "breached"
  ↓
Update Workflow Status to "escalated"
  ↓
Reassign to Escalation Target
  ↓
Send Notifications (Escalation Target, Original Approver, Initiator)
  ↓
Create Audit Log Entry
  ↓
Dispatch "workflow.escalated" Event
  ↓
Export Metrics
```

## Error Handling

### Task Retries
Failed tasks automatically retry with exponential backoff:
```python
@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=300  # 5 minutes
)
```

### Graceful Degradation
- If notifications fail, escalation still proceeds
- If metrics export fails, job continues
- All errors logged with structured logging

### Monitoring Failures
Track escalation failures via metric:
```
workflow_escalation_failures_total
```

## Testing

### Unit Tests
Run the test suite:
```bash
cd python_backend
pytest tests/test_workflow_escalation.py -v
```

Test coverage includes:
- SLA status checking
- Escalation logic
- Notification dispatch
- Audit logging
- Metrics export
- Error handling
- Integration tests

### Manual Testing

1. Create a workflow instance with short SLA
2. Wait for SLA warning threshold
3. Verify reminder sent
4. Wait for SLA breach
5. Verify escalation occurred
6. Check audit logs
7. Verify metrics updated

## Alerts & Monitoring

### Recommended Alerts

#### High SLA Breach Rate
```yaml
alert: HighWorkflowSLABreachRate
expr: |
  rate(workflow_tasks_over_sla_total[1h]) > 0.1
for: 10m
annotations:
  summary: "High rate of workflow SLA breaches"
```

#### Escalation Job Failures
```yaml
alert: WorkflowEscalationJobFailing
expr: |
  increase(workflow_escalation_failures_total[5m]) > 3
for: 5m
annotations:
  summary: "Workflow escalation job experiencing failures"
```

#### Long Escalation Duration
```yaml
alert: SlowWorkflowEscalationJob
expr: |
  workflow_escalation_duration_seconds > 30
for: 5m
annotations:
  summary: "Workflow escalation job taking too long"
```

#### Many Pending Workflows
```yaml
alert: HighPendingWorkflowCount
expr: |
  workflow_pending_count > 100
for: 15m
annotations:
  summary: "Large backlog of pending workflows"
```

## Best Practices

### 1. SLA Configuration
- Set realistic SLA thresholds based on business requirements
- Consider business hours vs 24/7 monitoring
- Define clear escalation paths

### 2. Escalation Hierarchy
- Define multiple escalation levels
- Ensure escalation targets have appropriate permissions
- Avoid circular escalations

### 3. Notification Frequency
- Balance between timely reminders and notification fatigue
- Use warning threshold to give advance notice
- Consider rate limiting for reminders

### 4. Performance Optimization
- Limit query batch size for large deployments
- Use database indexes on workflow instance queries
- Consider sharding for very large organizations

### 5. Monitoring & Alerting
- Monitor escalation job success rate
- Track SLA compliance metrics
- Alert on unusual patterns

## Troubleshooting

### Escalations Not Running
1. Check Celery worker is running: `celery -A app.celery_app inspect active`
2. Check Celery Beat is running: `celery -A app.celery_app inspect scheduled`
3. Verify queue configuration
4. Check logs: `tail -f logs/celery.log`

### Notifications Not Sent
1. Verify notification service is configured
2. Check email/notification service credentials
3. Review notification_service logs
4. Test notification service independently

### Metrics Not Exported
1. Verify prometheus-client is installed
2. Check metrics endpoint: `curl /api/v1/metrics/prometheus`
3. Review application logs for export errors
4. Verify Prometheus scrape configuration

### High Failure Rate
1. Check database connectivity
2. Review error logs for patterns
3. Verify external dependencies (email, notification service)
4. Check resource constraints (memory, CPU)

## Future Enhancements

### Planned Features
- [ ] Configurable escalation policies per workflow type
- [ ] Multi-level escalation chains
- [ ] Business hours awareness for SLA calculation
- [ ] Escalation rollback/override capability
- [ ] Dashboard for real-time monitoring
- [ ] ML-based SLA prediction
- [ ] Integration with external alerting systems

### Integration Opportunities
- Slack/Teams notifications
- SMS alerts for critical escalations
- Integration with ticketing systems
- Calendar integration for approver availability

## Related Documentation

- [Workflow Engine Documentation](./workflows.md)
- [Scheduler Service Documentation](./scheduler.md)
- [Celery Configuration](./celery.md)
- [Monitoring & Metrics](./monitoring.md)
- [API Reference](./api_reference.md)

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review metrics at `/api/v1/metrics/workflow-escalations`
3. Consult troubleshooting section above
4. Open a GitHub issue with logs and error details
