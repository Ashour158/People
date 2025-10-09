"""
Custom Workflow Engine API Endpoints
Flexible workflow management for approvals, escalations, and custom business processes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from enum import Enum
import structlog
import uuid

from app.db.database import get_db
from app.middleware.auth import AuthMiddleware
from app.schemas.schemas import BaseResponse
from app.models.models import Employee
from app.events.event_dispatcher import EventDispatcher
from pydantic import BaseModel, Field, validator

logger = structlog.get_logger()
router = APIRouter(prefix="/workflows", tags=["Workflow Engine"])


# ============= Enums and Types =============

class WorkflowStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class WorkflowInstanceStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    ESCALATED = "escalated"


class ActionType(str, Enum):
    APPROVAL = "approval"
    REJECTION = "rejection"
    ESCALATION = "escalation"
    NOTIFICATION = "notification"
    CUSTOM = "custom"


# ============= Pydantic Models =============

class WorkflowCondition(BaseModel):
    """Workflow condition/rule"""
    field: str = Field(..., description="Field to evaluate")
    operator: str = Field(..., description="eq, ne, gt, lt, gte, lte, in, contains")
    value: Any = Field(..., description="Value to compare against")
    
    @validator('operator')
    def validate_operator(cls, v):
        allowed = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'contains', 'not_in']
        if v not in allowed:
            raise ValueError(f'operator must be one of {allowed}')
        return v


class WorkflowAction(BaseModel):
    """Workflow action to execute"""
    action_type: ActionType
    target: str = Field(..., description="email, webhook_url, user_id, role")
    parameters: Dict[str, Any] = Field(default_factory=dict)
    delay_seconds: Optional[int] = Field(None, ge=0, description="Delay before executing action")


class WorkflowStage(BaseModel):
    """Individual stage in workflow"""
    stage_name: str
    stage_order: int = Field(..., ge=1)
    approver_type: str = Field(..., description="user, role, manager, department_head, custom")
    approver_ids: Optional[List[str]] = Field(None, description="Specific user IDs if approver_type is user")
    approval_type: str = Field(default="any", description="any, all, majority, custom")
    sla_hours: Optional[int] = Field(None, ge=1, description="SLA in hours for this stage")
    escalation_enabled: bool = Field(default=True)
    escalation_after_hours: Optional[int] = Field(None, ge=1)
    escalation_to: Optional[str] = Field(None, description="Role or user ID to escalate to")
    conditions: List[WorkflowCondition] = Field(default_factory=list, description="Conditions for this stage")
    actions_on_approve: List[WorkflowAction] = Field(default_factory=list)
    actions_on_reject: List[WorkflowAction] = Field(default_factory=list)


class WorkflowDefinition(BaseModel):
    """Complete workflow definition"""
    workflow_name: str = Field(..., min_length=3, max_length=100)
    workflow_type: str = Field(..., description="leave, expense, purchase, custom")
    description: Optional[str] = None
    trigger_event: str = Field(..., description="manual, automated, scheduled")
    stages: List[WorkflowStage]
    enable_parallel_approval: bool = Field(default=False)
    allow_comments: bool = Field(default=True)
    allow_attachments: bool = Field(default=True)
    auto_cancel_after_days: Optional[int] = Field(None, ge=1)
    status: WorkflowStatus = Field(default=WorkflowStatus.DRAFT)


class WorkflowInstanceCreate(BaseModel):
    """Create workflow instance"""
    workflow_id: str
    initiated_by: str
    request_data: Dict[str, Any] = Field(..., description="The actual request data")
    priority: str = Field(default="normal", description="low, normal, high, urgent")
    comments: Optional[str] = None
    attachments: Optional[List[str]] = Field(None, description="URLs or file IDs")


class WorkflowActionRequest(BaseModel):
    """Take action on workflow instance"""
    instance_id: str
    action: ActionType
    comments: Optional[str] = None
    attachments: Optional[List[str]] = None


class EscalationPolicy(BaseModel):
    """Escalation policy definition"""
    policy_name: str
    workflow_type: str
    escalation_levels: List[Dict[str, Any]] = Field(
        ..., 
        description="List of escalation levels with conditions and targets"
    )
    notification_channels: List[str] = Field(
        default=["email", "in_app"],
        description="Channels to use for escalation notifications"
    )


# ============= Workflow Engine Service =============

class WorkflowEngine:
    """Core workflow engine for processing approvals and routing"""
    
    @staticmethod
    def evaluate_condition(condition: WorkflowCondition, data: Dict[str, Any]) -> bool:
        """Evaluate a workflow condition against request data"""
        field_value = data.get(condition.field)
        
        if condition.operator == "eq":
            return field_value == condition.value
        elif condition.operator == "ne":
            return field_value != condition.value
        elif condition.operator == "gt":
            return field_value > condition.value
        elif condition.operator == "lt":
            return field_value < condition.value
        elif condition.operator == "gte":
            return field_value >= condition.value
        elif condition.operator == "lte":
            return field_value <= condition.value
        elif condition.operator == "in":
            return field_value in condition.value
        elif condition.operator == "not_in":
            return field_value not in condition.value
        elif condition.operator == "contains":
            return condition.value in str(field_value)
        else:
            return False
    
    @staticmethod
    def determine_approvers(
        stage: WorkflowStage,
        request_data: Dict[str, Any],
        initiator_id: str
    ) -> List[str]:
        """Determine who should approve this stage"""
        if stage.approver_type == "user" and stage.approver_ids:
            return stage.approver_ids
        elif stage.approver_type == "manager":
            # In production, query the manager from employee hierarchy
            return ["manager_id_placeholder"]
        elif stage.approver_type == "department_head":
            return ["dept_head_id_placeholder"]
        elif stage.approver_type == "role":
            # Query users with specific role
            return ["role_users_placeholder"]
        else:
            return []
    
    @staticmethod
    def check_sla_breach(
        stage_started_at: datetime,
        sla_hours: int
    ) -> bool:
        """Check if SLA has been breached"""
        elapsed = datetime.now() - stage_started_at
        return elapsed.total_seconds() > (sla_hours * 3600)
    
    @staticmethod
    async def execute_action(action: WorkflowAction, context: Dict[str, Any]):
        """Execute a workflow action"""
        if action.action_type == ActionType.NOTIFICATION:
            # Send notification
            logger.info(f"Sending notification to {action.target}")
            await EventDispatcher.dispatch("workflow.notification", {
                "target": action.target,
                "parameters": action.parameters
            })
        elif action.action_type == ActionType.ESCALATION:
            # Escalate to higher authority
            logger.info(f"Escalating to {action.target}")
            await EventDispatcher.dispatch("workflow.escalated", {
                "escalated_to": action.target,
                "context": context
            })
        elif action.action_type == ActionType.CUSTOM:
            # Execute custom logic
            logger.info(f"Executing custom action: {action.parameters}")
        
    @classmethod
    async def process_workflow_instance(
        cls,
        workflow_def: WorkflowDefinition,
        instance_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process a workflow instance through its stages"""
        current_stage_index = 0
        instance_status = WorkflowInstanceStatus.PENDING
        
        # Determine which stages apply based on conditions
        applicable_stages = []
        for stage in workflow_def.stages:
            # Check if stage conditions are met
            if not stage.conditions:
                applicable_stages.append(stage)
            else:
                conditions_met = all(
                    cls.evaluate_condition(cond, instance_data["request_data"])
                    for cond in stage.conditions
                )
                if conditions_met:
                    applicable_stages.append(stage)
        
        if not applicable_stages:
            return {
                "status": "error",
                "message": "No applicable workflow stages found"
            }
        
        # Start with first applicable stage
        current_stage = applicable_stages[0]
        approvers = cls.determine_approvers(
            current_stage,
            instance_data["request_data"],
            instance_data["initiated_by"]
        )
        
        return {
            "instance_id": instance_data.get("instance_id"),
            "workflow_id": instance_data.get("workflow_id"),
            "status": "in_progress",
            "current_stage": current_stage.stage_name,
            "current_approvers": approvers,
            "total_stages": len(applicable_stages),
            "completed_stages": 0,
            "sla_deadline": (
                datetime.now() + timedelta(hours=current_stage.sla_hours)
            ).isoformat() if current_stage.sla_hours else None
        }


# ============= API Endpoints =============

@router.post("/definitions", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow_definition(
    data: WorkflowDefinition,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Create a new workflow definition"""
    
    workflow_id = str(uuid.uuid4())
    
    logger.info(f"Workflow definition created: {workflow_id}")
    
    return BaseResponse(
        success=True,
        message="Workflow definition created successfully",
        data={
            "workflow_id": workflow_id,
            "workflow_name": data.workflow_name,
            "workflow_type": data.workflow_type,
            "total_stages": len(data.stages),
            "status": data.status,
            "created_at": datetime.now().isoformat()
        }
    )


@router.get("/definitions", response_model=BaseResponse)
async def list_workflow_definitions(
    workflow_type: Optional[str] = Query(None),
    status: Optional[WorkflowStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """List all workflow definitions"""
    
    # Mock workflow definitions
    workflows = [
        {
            "workflow_id": str(uuid.uuid4()),
            "workflow_name": "Leave Approval Workflow",
            "workflow_type": "leave",
            "stages": 2,
            "status": "active",
            "created_at": "2024-01-15T10:00:00Z"
        },
        {
            "workflow_id": str(uuid.uuid4()),
            "workflow_name": "Expense Approval (Under $1000)",
            "workflow_type": "expense",
            "stages": 1,
            "status": "active",
            "created_at": "2024-01-20T14:30:00Z"
        },
        {
            "workflow_id": str(uuid.uuid4()),
            "workflow_name": "Expense Approval (Over $1000)",
            "workflow_type": "expense",
            "stages": 3,
            "status": "active",
            "created_at": "2024-01-20T14:35:00Z"
        },
        {
            "workflow_id": str(uuid.uuid4()),
            "workflow_name": "Purchase Order Approval",
            "workflow_type": "purchase",
            "stages": 4,
            "status": "active",
            "created_at": "2024-02-01T09:00:00Z"
        }
    ]
    
    if workflow_type:
        workflows = [w for w in workflows if w["workflow_type"] == workflow_type]
    
    if status:
        workflows = [w for w in workflows if w["status"] == status.value]
    
    return BaseResponse(
        success=True,
        message=f"Retrieved {len(workflows)} workflow definitions",
        data={
            "total": len(workflows),
            "workflows": workflows
        }
    )


@router.get("/definitions/{workflow_id}", response_model=BaseResponse)
async def get_workflow_definition(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get workflow definition details"""
    
    # Mock detailed workflow definition
    workflow = {
        "workflow_id": workflow_id,
        "workflow_name": "Leave Approval Workflow",
        "workflow_type": "leave",
        "description": "Standard leave approval process",
        "trigger_event": "manual",
        "status": "active",
        "stages": [
            {
                "stage_name": "Manager Approval",
                "stage_order": 1,
                "approver_type": "manager",
                "approval_type": "any",
                "sla_hours": 24,
                "escalation_enabled": True,
                "escalation_after_hours": 48,
                "escalation_to": "department_head",
                "conditions": [
                    {
                        "field": "leave_days",
                        "operator": "lte",
                        "value": 5
                    }
                ]
            },
            {
                "stage_name": "HR Approval",
                "stage_order": 2,
                "approver_type": "role",
                "approver_ids": ["hr_manager"],
                "approval_type": "any",
                "sla_hours": 48,
                "escalation_enabled": True,
                "escalation_after_hours": 72,
                "escalation_to": "hr_director",
                "conditions": []
            }
        ],
        "enable_parallel_approval": False,
        "allow_comments": True,
        "allow_attachments": True,
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T10:00:00Z"
    }
    
    return BaseResponse(
        success=True,
        message="Workflow definition retrieved",
        data=workflow
    )


@router.post("/instances", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow_instance(
    data: WorkflowInstanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Start a new workflow instance"""
    
    instance_id = str(uuid.uuid4())
    
    # Mock workflow definition retrieval
    workflow_def = WorkflowDefinition(
        workflow_name="Leave Approval",
        workflow_type="leave",
        trigger_event="manual",
        stages=[
            WorkflowStage(
                stage_name="Manager Approval",
                stage_order=1,
                approver_type="manager",
                sla_hours=24,
                escalation_enabled=True,
                escalation_after_hours=48
            )
        ]
    )
    
    # Process the workflow instance
    instance_data = {
        "instance_id": instance_id,
        "workflow_id": data.workflow_id,
        "initiated_by": data.initiated_by,
        "request_data": data.request_data
    }
    
    result = await WorkflowEngine.process_workflow_instance(workflow_def, instance_data)
    
    logger.info(f"Workflow instance created: {instance_id}")
    
    await EventDispatcher.dispatch("workflow.instance_created", {
        "instance_id": instance_id,
        "workflow_id": data.workflow_id,
        "initiated_by": data.initiated_by
    })
    
    return BaseResponse(
        success=True,
        message="Workflow instance created successfully",
        data={
            "instance_id": instance_id,
            "workflow_id": data.workflow_id,
            "status": result.get("status"),
            "current_stage": result.get("current_stage"),
            "current_approvers": result.get("current_approvers"),
            "sla_deadline": result.get("sla_deadline"),
            "created_at": datetime.now().isoformat()
        }
    )


@router.post("/instances/action", response_model=BaseResponse)
async def take_workflow_action(
    data: WorkflowActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Take action on a workflow instance (approve/reject/escalate)"""
    
    logger.info(f"Workflow action taken on {data.instance_id}: {data.action}")
    
    # Determine next status based on action
    next_status = None
    if data.action == ActionType.APPROVAL:
        next_status = "approved"
        message = "Workflow approved successfully"
    elif data.action == ActionType.REJECTION:
        next_status = "rejected"
        message = "Workflow rejected"
    elif data.action == ActionType.ESCALATION:
        next_status = "escalated"
        message = "Workflow escalated"
    else:
        next_status = "in_progress"
        message = "Action processed"
    
    await EventDispatcher.dispatch("workflow.action_taken", {
        "instance_id": data.instance_id,
        "action": data.action,
        "actor_id": current_user["user_id"],
        "status": next_status
    })
    
    return BaseResponse(
        success=True,
        message=message,
        data={
            "instance_id": data.instance_id,
            "action": data.action,
            "status": next_status,
            "actor_id": current_user["user_id"],
            "actor_name": current_user.get("email"),
            "action_taken_at": datetime.now().isoformat()
        }
    )


@router.get("/instances", response_model=BaseResponse)
async def list_workflow_instances(
    status: Optional[WorkflowInstanceStatus] = Query(None),
    workflow_type: Optional[str] = Query(None),
    assigned_to_me: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """List workflow instances"""
    
    # Mock workflow instances
    instances = [
        {
            "instance_id": str(uuid.uuid4()),
            "workflow_name": "Leave Approval Workflow",
            "workflow_type": "leave",
            "initiated_by": "John Doe",
            "initiated_by_id": str(uuid.uuid4()),
            "current_stage": "Manager Approval",
            "status": "pending",
            "priority": "normal",
            "sla_deadline": (datetime.now() + timedelta(hours=20)).isoformat(),
            "created_at": (datetime.now() - timedelta(hours=4)).isoformat()
        },
        {
            "instance_id": str(uuid.uuid4()),
            "workflow_name": "Expense Approval",
            "workflow_type": "expense",
            "initiated_by": "Jane Smith",
            "initiated_by_id": str(uuid.uuid4()),
            "current_stage": "Finance Approval",
            "status": "in_progress",
            "priority": "high",
            "sla_deadline": (datetime.now() + timedelta(hours=12)).isoformat(),
            "created_at": (datetime.now() - timedelta(hours=8)).isoformat()
        },
        {
            "instance_id": str(uuid.uuid4()),
            "workflow_name": "Leave Approval Workflow",
            "workflow_type": "leave",
            "initiated_by": "Bob Johnson",
            "initiated_by_id": str(uuid.uuid4()),
            "current_stage": "Completed",
            "status": "approved",
            "priority": "normal",
            "sla_deadline": None,
            "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
            "completed_at": (datetime.now() - timedelta(days=1)).isoformat()
        }
    ]
    
    if status:
        instances = [i for i in instances if i["status"] == status.value]
    
    if workflow_type:
        instances = [i for i in instances if i["workflow_type"] == workflow_type]
    
    # Pagination
    start = (page - 1) * limit
    end = start + limit
    paginated = instances[start:end]
    
    return BaseResponse(
        success=True,
        message=f"Retrieved {len(paginated)} workflow instances",
        data={
            "total": len(instances),
            "page": page,
            "limit": limit,
            "instances": paginated
        }
    )


@router.get("/instances/{instance_id}", response_model=BaseResponse)
async def get_workflow_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get workflow instance details with full history"""
    
    # Mock detailed instance data
    instance = {
        "instance_id": instance_id,
        "workflow_id": str(uuid.uuid4()),
        "workflow_name": "Leave Approval Workflow",
        "workflow_type": "leave",
        "initiated_by": {
            "user_id": str(uuid.uuid4()),
            "name": "John Doe",
            "email": "john.doe@company.com"
        },
        "request_data": {
            "leave_type": "Annual Leave",
            "start_date": "2024-02-15",
            "end_date": "2024-02-19",
            "total_days": 5,
            "reason": "Family vacation"
        },
        "status": "in_progress",
        "priority": "normal",
        "current_stage": "Manager Approval",
        "workflow_history": [
            {
                "stage": "Manager Approval",
                "status": "pending",
                "assignee": "Sarah Manager",
                "started_at": (datetime.now() - timedelta(hours=4)).isoformat(),
                "sla_deadline": (datetime.now() + timedelta(hours=20)).isoformat()
            }
        ],
        "comments": [
            {
                "comment_id": str(uuid.uuid4()),
                "user": "John Doe",
                "comment": "Urgently need this approved",
                "created_at": (datetime.now() - timedelta(hours=2)).isoformat()
            }
        ],
        "attachments": [],
        "created_at": (datetime.now() - timedelta(hours=4)).isoformat(),
        "updated_at": (datetime.now() - timedelta(hours=2)).isoformat()
    }
    
    return BaseResponse(
        success=True,
        message="Workflow instance retrieved",
        data=instance
    )


@router.post("/escalation-policies", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_escalation_policy(
    data: EscalationPolicy,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Create escalation policy"""
    
    policy_id = str(uuid.uuid4())
    
    logger.info(f"Escalation policy created: {policy_id}")
    
    return BaseResponse(
        success=True,
        message="Escalation policy created successfully",
        data={
            "policy_id": policy_id,
            "policy_name": data.policy_name,
            "workflow_type": data.workflow_type,
            "escalation_levels": len(data.escalation_levels),
            "created_at": datetime.now().isoformat()
        }
    )


@router.get("/analytics/performance")
async def get_workflow_analytics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    workflow_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get workflow performance analytics"""
    
    # Mock analytics data
    analytics = {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "total_workflows": 250,
        "completed_workflows": 220,
        "pending_workflows": 25,
        "rejected_workflows": 5,
        "completion_rate": 88.0,
        "average_completion_time_hours": 36.5,
        "sla_compliance_rate": 92.0,
        "workflows_by_type": {
            "leave": {"total": 120, "completed": 110, "avg_time_hours": 24},
            "expense": {"total": 80, "completed": 70, "avg_time_hours": 48},
            "purchase": {"total": 50, "completed": 40, "avg_time_hours": 72}
        },
        "bottlenecks": [
            {
                "stage": "Finance Approval",
                "workflow_type": "expense",
                "average_wait_time_hours": 65,
                "sla_hours": 48,
                "breach_rate": 35.0
            }
        ],
        "top_approvers": [
            {"name": "Sarah Manager", "approvals": 45, "avg_time_hours": 12},
            {"name": "Mike Finance", "approvals": 38, "avg_time_hours": 24}
        ]
    }
    
    return BaseResponse(
        success=True,
        message="Workflow analytics retrieved",
        data=analytics
    )
