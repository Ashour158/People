#!/usr/bin/env python3
"""
Example script demonstrating workflow escalation automation
Run this to see the escalation service in action
"""
import asyncio
import sys
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, '/home/runner/work/People/People/python_backend')

from app.services.workflow_escalation_service import WorkflowEscalationService


async def demo_sla_checking():
    """Demonstrate SLA status checking"""
    print("\n" + "="*60)
    print("DEMO: SLA Status Checking")
    print("="*60)
    
    service = WorkflowEscalationService()
    
    # Test cases
    test_cases = [
        {
            "name": "Within SLA",
            "instance": {
                "instance_id": "wf-001",
                "stage_started_at": datetime.now() - timedelta(hours=2),
                "sla_hours": 24
            }
        },
        {
            "name": "Approaching SLA (Warning)",
            "instance": {
                "instance_id": "wf-002",
                "stage_started_at": datetime.now() - timedelta(hours=22),
                "sla_hours": 24
            }
        },
        {
            "name": "SLA Breached",
            "instance": {
                "instance_id": "wf-003",
                "stage_started_at": datetime.now() - timedelta(hours=48),
                "sla_hours": 24
            }
        }
    ]
    
    for test in test_cases:
        status = service._check_sla_status(test["instance"])
        elapsed_hours = (datetime.now() - test["instance"]["stage_started_at"]).total_seconds() / 3600
        
        print(f"\n{test['name']}:")
        print(f"  Instance ID: {test['instance']['instance_id']}")
        print(f"  Elapsed: {elapsed_hours:.1f} hours")
        print(f"  SLA: {test['instance']['sla_hours']} hours")
        print(f"  Status: {status.upper()}")
        
        if status == "ok":
            print(f"  ✅ Within SLA")
        elif status == "warning":
            print(f"  ⚠️  Warning - Reminder will be sent")
        elif status == "breached":
            print(f"  🚨 Breached - Will escalate!")


async def demo_escalation_check():
    """Demonstrate full escalation check"""
    print("\n" + "="*60)
    print("DEMO: Full Escalation Check")
    print("="*60)
    
    service = WorkflowEscalationService()
    service.reset_metrics()
    
    print("\nRunning escalation check on mock workflow instances...")
    print("(This simulates the scheduled job that runs every 15 minutes)")
    
    result = await service.check_and_escalate_workflows()
    
    print(f"\n📊 Results:")
    print(f"  Total Checked: {result['total_checked']}")
    print(f"  Escalated: {result['escalated']} 🚨")
    print(f"  Reminded: {result['reminded']} ⚠️")
    print(f"  Duration: {result['duration_seconds']:.2f} seconds")
    
    print(f"\n📈 Cumulative Metrics:")
    metrics = service.get_metrics()
    for key, value in metrics.items():
        print(f"  {key}: {value}")


async def demo_metrics():
    """Demonstrate metrics tracking"""
    print("\n" + "="*60)
    print("DEMO: Metrics Tracking")
    print("="*60)
    
    service = WorkflowEscalationService()
    service.reset_metrics()
    
    print("\nInitial metrics:")
    print(service.get_metrics())
    
    print("\nRunning multiple escalation checks...")
    for i in range(3):
        print(f"  Run {i+1}...")
        await service.check_and_escalate_workflows()
    
    print("\nFinal metrics:")
    metrics = service.get_metrics()
    for key, value in metrics.items():
        print(f"  {key}: {value}")
    
    print("\n💡 These metrics are exported to Prometheus for monitoring!")


async def main():
    """Run all demos"""
    print("\n" + "="*60)
    print("🚀 Workflow Escalation Automation Demo")
    print("="*60)
    print("\nThis demo shows how the workflow escalation service works:")
    print("1. Checks SLA status for pending workflows")
    print("2. Sends warnings when approaching deadline")
    print("3. Escalates when SLA is breached")
    print("4. Tracks metrics for monitoring")
    
    try:
        await demo_sla_checking()
        await demo_escalation_check()
        await demo_metrics()
        
        print("\n" + "="*60)
        print("✅ Demo Complete!")
        print("="*60)
        print("\nNext Steps:")
        print("1. Start Celery worker: celery -A app.celery_app worker -Q workflows")
        print("2. Start Celery beat: celery -A app.celery_app beat")
        print("3. Monitor logs to see automatic escalation checks every 15 minutes")
        print("4. Check metrics: curl http://localhost:5000/api/v1/metrics/workflow-escalations")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
