# Workflow Escalation System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Workflow Escalation System                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐      ┌──────────────────────────┐
│   Celery Beat           │      │   Celery Worker          │
│   (Scheduler)           │─────▶│   (Task Processor)       │
│                         │      │                          │
│ • Runs every 15 min     │      │ • Processes tasks        │
│ • Triggers tasks        │      │ • Retry on failure       │
└─────────────────────────┘      └──────────────────────────┘
                                          │
                                          ▼
                         ┌────────────────────────────────┐
                         │ WorkflowEscalationService      │
                         │                                │
                         │ • Check SLA status             │
                         │ • Escalate breached workflows  │
                         │ • Send reminders               │
                         │ • Create audit logs            │
                         │ • Export metrics               │
                         └────────────────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
        ┌───────────────────┐ ┌──────────────────┐ ┌────────────────┐
        │ Notification      │ │ Audit Logs       │ │ Prometheus     │
        │ Service           │ │                  │ │ Metrics        │
        │                   │ │ • Escalations    │ │                │
        │ • Email           │ │ • Warnings       │ │ • Counters     │
        │ • In-app          │ │ • Timestamps     │ │ • Histograms   │
        │ • SMS (future)    │ │ • Details        │ │ • Gauges       │
        └───────────────────┘ └──────────────────┘ └────────────────┘
```

## Workflow State Machine

```
                    ┌──────────────┐
                    │   PENDING    │
                    │   Workflow   │
                    └──────┬───────┘
                           │
                  ┌────────▼────────┐
                  │  Check SLA      │
                  │  Status         │
                  └────────┬────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │   OK     │   │ WARNING  │   │ BREACHED │
    │ < 22h    │   │ 22-24h   │   │  > 24h   │
    └────┬─────┘   └────┬─────┘   └────┬─────┘
         │              │              │
         │              ▼              ▼
         │      ┌────────────┐  ┌────────────┐
         │      │   Send     │  │  Escalate  │
         │      │  Reminder  │  │  Workflow  │
         │      └────────────┘  └──────┬─────┘
         │                             │
         │                             ▼
         │                      ┌──────────────┐
         │                      │  ESCALATED   │
         │                      │  Reassign to │
         │                      │  Higher Auth │
         └──────────────────────┤              │
                                └──────────────┘
```

## SLA Timeline Example

```
Time:    0h        10h        20h        22h        24h        26h
         │          │          │          │          │          │
Workflow │          │          │          │          │          │
Created  ▼          │          │          │          │          │
         ●──────────┼──────────┼──────────┼──────────┼──────────▶
         │          │          │          │          │          │
         │          │          │          │          │          │
Status:  │◄─────── OK ─────────────────▶│◄Warning▶│◄Breached▶│
         │                               │          │          │
         │                               ▼          ▼          │
         │                           ⚠️  Send   🚨 Escalate  │
         │                              Reminder              │
         │                                                     │
         └─────────────────────────────────────────────────────┘
                         24h SLA Deadline ▲
```

## Escalation Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Workflow Instance                             │
│  Status: PENDING                                                 │
│  Current Stage: Manager Approval                                 │
│  Started: 48 hours ago                                           │
│  SLA: 24 hours                                                   │
│  Escalation Target: Department Head                              │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ Escalation Job Runs    │
            │ (Every 15 minutes)     │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ Check SLA:             │
            │ 48h > 24h = BREACHED   │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────────────────┐
            │ Escalation Actions:                │
            │                                    │
            │ 1. Update status → ESCALATED       │
            │ 2. Reassign → Department Head      │
            │ 3. Send notifications:             │
            │    • To: Department Head           │
            │    • CC: Original Manager          │
            │    • CC: Workflow Initiator        │
            │ 4. Create audit log entry          │
            │ 5. Dispatch event                  │
            │ 6. Export metrics                  │
            └────────────┬───────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Department   │ │ Audit Log    │ │ Metrics      │
│ Head Gets    │ │ Entry        │ │ Incremented  │
│ Notification │ │ Created      │ │              │
│              │ │              │ │ • Escalated+ │
│ "Urgent:     │ │ {            │ │ • Breached+  │
│ Workflow     │ │   action:    │ │ • Duration   │
│ escalated"   │ │   "escalate" │ │   recorded   │
└──────────────┘ │   reason:    │ └──────────────┘
                 │   "sla"      │
                 │   elapsed:   │
                 │   48h        │
                 │ }            │
                 └──────────────┘
```

## Metrics Flow

```
┌───────────────────────────────────────────────────────────────┐
│                    Escalation Job                             │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ Process Workflows       │
              │ • Check: 10             │
              │ • Escalate: 2           │
              │ • Remind: 3             │
              │ • Duration: 1.2s        │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Export to Prometheus    │
              │                         │
              │ WORKFLOW_TASKS_CHECKED  │
              │   .inc(10)              │
              │                         │
              │ WORKFLOW_TASKS_ESCALATED│
              │   .inc(2)               │
              │                         │
              │ WORKFLOW_TASKS_REMINDED │
              │   .inc(3)               │
              │                         │
              │ WORKFLOW_DURATION       │
              │   .observe(1.2)         │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Prometheus Server       │
              │ (Scrapes /metrics)      │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Grafana Dashboard       │
              │                         │
              │ • SLA Compliance Rate   │
              │ • Escalation Trends     │
              │ • Processing Time       │
              │ • Alert Thresholds      │
              └─────────────────────────┘
```

## Alert Configuration Example

```
┌──────────────────────────────────────────────────────────────┐
│                  Prometheus Alerts                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ HighSLABreachRate:                                          │
│   IF rate(workflow_tasks_over_sla_total[1h]) > 0.1         │
│   FOR 10m                                                    │
│   THEN Alert: "High rate of SLA breaches"                   │
│                                                              │
│ EscalationJobFailing:                                        │
│   IF increase(workflow_escalation_failures_total[5m]) > 3   │
│   FOR 5m                                                     │
│   THEN Alert: "Escalation job experiencing failures"        │
│                                                              │
│ SlowEscalationJob:                                          │
│   IF workflow_escalation_duration_seconds > 30              │
│   FOR 5m                                                     │
│   THEN Alert: "Job taking too long"                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │  Email   │      │  Slack   │      │ PagerDuty│
    │  Alert   │      │  Channel │      │  Incident│
    └──────────┘      └──────────┘      └──────────┘
```

## Component Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Stack                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                          │
│  │  FastAPI     │  ◄─── Exposes metrics endpoint           │
│  │  Server      │                                          │
│  └──────┬───────┘                                          │
│         │                                                   │
│  ┌──────▼───────┐      ┌──────────────┐                   │
│  │  Redis       │◄────▶│   Celery     │                   │
│  │  (Broker)    │      │   Worker     │                   │
│  └──────────────┘      └──────┬───────┘                   │
│                               │                            │
│  ┌──────────────┐      ┌──────▼───────┐                   │
│  │ PostgreSQL   │◄────▶│  Workflow    │                   │
│  │ (Database)   │      │  Escalation  │                   │
│  └──────────────┘      │  Service     │                   │
│                        └──────┬───────┘                   │
│  ┌──────────────┐            │                            │
│  │ Email/SMS    │◄───────────┘                            │
│  │ Service      │                                          │
│  └──────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Kubernetes Cluster                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ FastAPI Pod    │  │ Celery Worker  │  │ Celery Beat   │ │
│  │ (3 replicas)   │  │ (5 replicas)   │  │ (1 replica)   │ │
│  │                │  │                │  │               │ │
│  │ Port: 5000     │  │ Queue:         │  │ Scheduler     │ │
│  │ /metrics       │  │ workflows      │  │ Every 15min   │ │
│  └────────┬───────┘  └────────┬───────┘  └───────┬───────┘ │
│           │                   │                  │         │
│           └───────────────────┼──────────────────┘         │
│                               │                            │
│  ┌─────────────────────────────────────────────┐          │
│  │           Redis Cluster                      │          │
│  │  (Master + 2 Replicas for HA)               │          │
│  └─────────────────────────────────────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              External Services                               │
├──────────────────────────────────────────────────────────────┤
│  • PostgreSQL (RDS/Cloud SQL)                               │
│  • Prometheus (Monitoring)                                   │
│  • Grafana (Dashboards)                                     │
│  • Email Service (SendGrid/SES)                             │
└──────────────────────────────────────────────────────────────┘
```

## Key Integration Points

1. **Celery Beat → Celery Worker**
   - Schedule defined in `scheduler_service.py`
   - Task: `check_workflow_escalations_task`
   - Frequency: Every 15 minutes

2. **Celery Worker → WorkflowEscalationService**
   - Executes async service method
   - Processes batch of workflows
   - Returns metrics

3. **WorkflowEscalationService → Database**
   - Query pending workflows (future)
   - Update workflow status
   - Create audit logs

4. **WorkflowEscalationService → Notification Service**
   - Send escalation notifications
   - Send SLA warnings
   - Multiple channels (email, in-app, SMS)

5. **WorkflowEscalationService → Prometheus**
   - Export counters, histograms, gauges
   - Metrics endpoint: `/api/v1/metrics/prometheus`
   - Scrape interval: 30 seconds

6. **Prometheus → Alertmanager → Notification Channels**
   - Evaluate alert rules
   - Send alerts to teams
   - Incident management integration
