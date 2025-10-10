# Workflow Escalation Quick Start

## Overview
This guide helps you quickly set up and test the workflow escalation automation feature.

## Prerequisites
- Python 3.9+
- Redis server running
- PostgreSQL database (optional for testing)

## Installation

1. **Install Dependencies**
```bash
cd python_backend
pip install -r requirements.txt
```

2. **Configure Environment**
```bash
# Copy example env file
cp .env.example .env

# Update Redis URL (if different)
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
```

## Running the Services

### Terminal 1: Start FastAPI Server
```bash
cd python_backend
uvicorn app.main:app --reload --port 5000
```

### Terminal 2: Start Celery Worker
```bash
cd python_backend
celery -A app.celery_app worker --loglevel=info -Q workflows,default
```

### Terminal 3: Start Celery Beat (Scheduler)
```bash
cd python_backend
celery -A app.celery_app beat --loglevel=info
```

## Testing the Feature

### 1. Check Service Health
```bash
# Check if metrics endpoint is available
curl http://localhost:5000/api/v1/metrics/workflow-escalations

# Expected response:
{
  "success": true,
  "data": {
    "workflows_checked": 0,
    "workflows_escalated": 0,
    "reminders_sent": 0,
    "sla_breaches": 0,
    "escalation_failures": 0
  }
}
```

### 2. View Prometheus Metrics
```bash
curl http://localhost:5000/api/v1/metrics/prometheus
```

### 3. Monitor Logs
Watch the escalation job run (every 15 minutes):
```bash
# In the Celery worker terminal, you'll see:
[INFO] workflow_escalation_task_started
[INFO] checking_workflow_escalations
[INFO] workflow_escalation_check_completed total_checked=2 escalated=1 reminded=1
```

### 4. Manual Trigger (for testing)
```python
# In Python shell or script
from app.tasks.workflow_tasks import check_workflow_escalations_task

# Trigger immediately
result = check_workflow_escalations_task.delay()
print(result.get())
```

### 5. Check Celery Beat Schedule
```bash
celery -A app.celery_app inspect scheduled

# You should see:
{
  "celery@hostname": [
    {
      "name": "tasks.check_workflow_escalations",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

## Monitoring

### View Real-time Metrics
Create a simple dashboard to monitor escalations:

```python
import requests
import time

while True:
    response = requests.get('http://localhost:5000/api/v1/metrics/workflow-escalations')
    metrics = response.json()['data']
    
    print(f"\n=== Workflow Escalation Metrics ===")
    print(f"Workflows Checked: {metrics['workflows_checked']}")
    print(f"Escalated: {metrics['workflows_escalated']}")
    print(f"Reminders Sent: {metrics['reminders_sent']}")
    print(f"SLA Breaches: {metrics['sla_breaches']}")
    print(f"Failures: {metrics['escalation_failures']}")
    
    time.sleep(60)  # Update every minute
```

### Prometheus Integration
Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'hr_workflows'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/api/v1/metrics/prometheus'
```

## Example Workflow with Escalation

```python
# Create a workflow definition with SLA
workflow_data = {
    "workflow_name": "Leave Approval",
    "workflow_type": "leave",
    "trigger_event": "manual",
    "stages": [
        {
            "stage_name": "Manager Approval",
            "stage_order": 1,
            "approver_type": "manager",
            "sla_hours": 24,              # 24-hour SLA
            "escalation_enabled": True,    # Enable escalation
            "escalation_after_hours": 48,  # Escalate after 48h
            "escalation_to": "department_head"
        }
    ]
}

# POST to /api/v1/workflows/definitions
```

When this workflow is pending for:
- **22 hours**: SLA warning reminder sent
- **25+ hours**: Automatically escalated to department head

## Testing Scenarios

### Scenario 1: SLA Warning
Mock data in service represents workflow at 22/24 hours. Next escalation check will send warning.

### Scenario 2: SLA Breach
Mock data represents workflow at 48/24 hours. Next escalation check will escalate.

### Scenario 3: Monitor Metrics
After each run, check metrics to see counters increase.

## Troubleshooting

### Worker Not Processing Tasks
```bash
# Check Celery worker is running
celery -A app.celery_app inspect active

# Check queue configuration
celery -A app.celery_app inspect registered
```

### No Escalations Happening
1. Check mock data in `workflow_escalation_service.py`
2. Verify SLA hours vs elapsed time
3. Check logs for errors

### Metrics Not Updating
1. Verify prometheus-client is installed: `pip list | grep prometheus`
2. Check for import errors in logs
3. Restart services after code changes

### Beat Not Scheduling
```bash
# Check beat is running
ps aux | grep "celery beat"

# View beat schedule
celery -A app.celery_app inspect scheduled
```

## Next Steps

1. **Replace Mock Data**: Update `_get_pending_workflow_instances_mock()` to query real database
2. **Configure Notifications**: Set up email/notification service
3. **Customize SLA Thresholds**: Adjust warning and escalation timings
4. **Set Up Alerts**: Configure Prometheus alerts for SLA breaches
5. **Dashboard**: Create Grafana dashboard for visualization

## Production Checklist

- [ ] Configure Redis for production (persistence, clustering)
- [ ] Set up proper database with workflow instance table
- [ ] Configure email/notification service
- [ ] Set up Prometheus + Grafana for monitoring
- [ ] Configure alerts for SLA breaches and failures
- [ ] Set up log aggregation (ELK, Datadog, etc.)
- [ ] Configure worker auto-scaling
- [ ] Set up health checks for Celery workers
- [ ] Document escalation policies
- [ ] Train team on monitoring dashboards

## Resources

- [Full Documentation](../docs/WORKFLOW_ESCALATION.md)
- [Workflow API Reference](./API_DOCUMENTATION_v2.md)
- [Celery Documentation](https://docs.celeryproject.org/)
- [Prometheus Client](https://github.com/prometheus/client_python)

## Support

For issues or questions:
- Check logs in Celery worker terminal
- Review metrics at `/api/v1/metrics/workflow-escalations`
- Consult [troubleshooting guide](../docs/WORKFLOW_ESCALATION.md#troubleshooting)
