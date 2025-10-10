"""
Prometheus Metrics for Workflow Escalations
Exports metrics for monitoring workflow SLA compliance and escalations
"""
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry

# Create a custom registry for workflow metrics
workflow_registry = CollectorRegistry()

# Counter for total workflows checked
WORKFLOW_TASKS_CHECKED = Counter(
    'workflow_tasks_checked_total',
    'Total number of workflow tasks checked for escalation',
    registry=workflow_registry
)

# Counter for workflows escalated
WORKFLOW_TASKS_ESCALATED = Counter(
    'workflow_tasks_escalated_total',
    'Total number of workflows escalated due to SLA breach',
    registry=workflow_registry
)

# Counter for reminders sent
WORKFLOW_TASKS_REMINDED = Counter(
    'workflow_tasks_reminded_total',
    'Total number of SLA warning reminders sent',
    registry=workflow_registry
)

# Counter for SLA breaches
WORKFLOW_TASKS_OVER_SLA = Counter(
    'workflow_tasks_over_sla_total',
    'Total number of workflows that breached SLA',
    registry=workflow_registry
)

# Counter for escalation failures
WORKFLOW_ESCALATION_FAILURES = Counter(
    'workflow_escalation_failures_total',
    'Total number of failed escalation attempts',
    registry=workflow_registry
)

# Histogram for escalation job duration
WORKFLOW_ESCALATION_DURATION = Histogram(
    'workflow_escalation_duration_seconds',
    'Time taken to run workflow escalation check',
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
    registry=workflow_registry
)

# Gauge for currently pending workflows
WORKFLOW_PENDING_COUNT = Gauge(
    'workflow_pending_count',
    'Number of workflows currently pending approval',
    registry=workflow_registry
)

# Gauge for workflows nearing SLA breach
WORKFLOW_NEAR_SLA_BREACH = Gauge(
    'workflow_near_sla_breach_count',
    'Number of workflows approaching SLA deadline',
    registry=workflow_registry
)


def increment_checked(count: int = 1):
    """Increment workflows checked counter"""
    WORKFLOW_TASKS_CHECKED.inc(count)


def increment_escalated(count: int = 1):
    """Increment workflows escalated counter"""
    WORKFLOW_TASKS_ESCALATED.inc(count)


def increment_reminded(count: int = 1):
    """Increment reminders sent counter"""
    WORKFLOW_TASKS_REMINDED.inc(count)


def increment_sla_breach(count: int = 1):
    """Increment SLA breaches counter"""
    WORKFLOW_TASKS_OVER_SLA.inc(count)


def increment_escalation_failure(count: int = 1):
    """Increment escalation failures counter"""
    WORKFLOW_ESCALATION_FAILURES.inc(count)


def observe_duration(duration_seconds: float):
    """Record escalation job duration"""
    WORKFLOW_ESCALATION_DURATION.observe(duration_seconds)


def set_pending_count(count: int):
    """Set the current number of pending workflows"""
    WORKFLOW_PENDING_COUNT.set(count)


def set_near_sla_breach_count(count: int):
    """Set the number of workflows near SLA breach"""
    WORKFLOW_NEAR_SLA_BREACH.set(count)
