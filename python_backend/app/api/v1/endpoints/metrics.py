"""
Metrics API endpoints
Exposes Prometheus metrics for monitoring
"""
from fastapi import APIRouter, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import structlog

from app.utils.workflow_metrics import workflow_registry
from app.services.workflow_escalation_service import workflow_escalation_service

logger = structlog.get_logger()
router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/workflow-escalations")
async def get_workflow_escalation_metrics():
    """
    Get current workflow escalation metrics
    Returns metrics in JSON format for easy consumption
    """
    try:
        metrics = workflow_escalation_service.get_metrics()
        
        return {
            "success": True,
            "data": metrics
        }
    except Exception as e:
        logger.error("metrics_retrieval_error", error=str(e))
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/prometheus")
async def prometheus_metrics():
    """
    Expose Prometheus metrics in the standard format
    This endpoint can be scraped by Prometheus server
    """
    try:
        metrics = generate_latest(workflow_registry)
        return Response(content=metrics, media_type=CONTENT_TYPE_LATEST)
    except Exception as e:
        logger.error("prometheus_metrics_error", error=str(e))
        return Response(
            content=f"# Error generating metrics: {str(e)}\n",
            media_type=CONTENT_TYPE_LATEST
        )
