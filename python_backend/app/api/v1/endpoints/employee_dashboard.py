"""
Dashboard & Employee Lifecycle API Endpoints
Dashboard configuration, widgets, quick actions, emergency contacts, career goals
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.db.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User
from app.models.employee_lifecycle import (
    EmergencyContact, CareerPath, CareerGoal, EmployeeCompetency,
    SuccessionPlan, DashboardWidget, EmployeeDashboard, QuickAction,
    NotificationPreference, EmployeeLifecycleEvent
)
from app.schemas.employee_lifecycle import (
    EmergencyContactCreate, EmergencyContactUpdate, EmergencyContactResponse,
    CareerGoalCreate, CareerGoalUpdate, CareerGoalResponse,
    EmployeeCompetencyCreate, EmployeeCompetencyResponse,
    DashboardWidgetCreate, DashboardWidgetResponse,
    EmployeeDashboardUpdate, EmployeeDashboardResponse,
    QuickActionCreate, QuickActionResponse,
    NotificationPreferenceUpdate, NotificationPreferenceResponse,
    EmployeeLifecycleEventCreate, EmployeeLifecycleEventResponse
)
from app.utils.response import success_response, error_response
from app.utils.pagination import paginate

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ==========================================
# EMERGENCY CONTACTS
# ==========================================

@router.post("/emergency-contacts", status_code=status.HTTP_201_CREATED)
async def create_emergency_contact(
    contact_data: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add an emergency contact"""
    try:
        # If this is marked as primary, unmark others
        if contact_data.is_primary:
            existing_query = select(EmergencyContact).where(
                EmergencyContact.employee_id == current_user.employee_id,
                EmergencyContact.is_primary == True
            )
            existing_result = await db.execute(existing_query)
            existing_primary = existing_result.scalars().all()
            
            for contact in existing_primary:
                contact.is_primary = False
        
        contact = EmergencyContact(
            employee_id=current_user.employee_id,
            **contact_data.model_dump()
        )
        
        db.add(contact)
        await db.commit()
        await db.refresh(contact)
        
        return success_response(
            data=EmergencyContactResponse.model_validate(contact),
            message="Emergency contact added successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add emergency contact: {str(e)}"
        )


@router.get("/emergency-contacts", response_model=List[EmergencyContactResponse])
async def list_emergency_contacts(
    employee_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List emergency contacts"""
    try:
        target_employee_id = employee_id or current_user.employee_id
        
        query = select(EmergencyContact).where(
            EmergencyContact.employee_id == target_employee_id
        ).order_by(EmergencyContact.priority_order)
        
        result = await db.execute(query)
        contacts = result.scalars().all()
        
        return success_response(
            data=[EmergencyContactResponse.model_validate(c) for c in contacts]
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch emergency contacts: {str(e)}"
        )


@router.put("/emergency-contacts/{contact_id}")
async def update_emergency_contact(
    contact_id: UUID,
    contact_data: EmergencyContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update emergency contact"""
    try:
        query = select(EmergencyContact).where(
            EmergencyContact.contact_id == contact_id,
            EmergencyContact.employee_id == current_user.employee_id
        )
        result = await db.execute(query)
        contact = result.scalar_one_or_none()
        
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency contact not found"
            )
        
        # Update fields
        update_data = contact_data.model_dump(exclude_unset=True)
        
        # If setting as primary, unmark others
        if update_data.get('is_primary'):
            existing_query = select(EmergencyContact).where(
                EmergencyContact.employee_id == current_user.employee_id,
                EmergencyContact.is_primary == True,
                EmergencyContact.contact_id != contact_id
            )
            existing_result = await db.execute(existing_query)
            existing_primary = existing_result.scalars().all()
            
            for c in existing_primary:
                c.is_primary = False
        
        for field, value in update_data.items():
            setattr(contact, field, value)
        
        contact.modified_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(contact)
        
        return success_response(
            data=EmergencyContactResponse.model_validate(contact),
            message="Emergency contact updated successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update emergency contact: {str(e)}"
        )


@router.delete("/emergency-contacts/{contact_id}")
async def delete_emergency_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete emergency contact"""
    try:
        query = select(EmergencyContact).where(
            EmergencyContact.contact_id == contact_id,
            EmergencyContact.employee_id == current_user.employee_id
        )
        result = await db.execute(query)
        contact = result.scalar_one_or_none()
        
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency contact not found"
            )
        
        await db.delete(contact)
        await db.commit()
        
        return success_response(message="Emergency contact deleted successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete emergency contact: {str(e)}"
        )


# ==========================================
# CAREER GOALS
# ==========================================

@router.post("/career-goals", status_code=status.HTTP_201_CREATED)
async def create_career_goal(
    goal_data: CareerGoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a career goal"""
    try:
        goal = CareerGoal(
            employee_id=current_user.employee_id,
            status="draft",
            progress_percentage=0,
            manager_reviewed=False,
            **goal_data.model_dump()
        )
        
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        
        return success_response(
            data=CareerGoalResponse.model_validate(goal),
            message="Career goal created successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create career goal: {str(e)}"
        )


@router.get("/career-goals", response_model=List[CareerGoalResponse])
async def list_career_goals(
    employee_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List career goals"""
    try:
        target_employee_id = employee_id or current_user.employee_id
        
        query = select(CareerGoal).where(
            CareerGoal.employee_id == target_employee_id
        )
        
        if status_filter:
            query = query.where(CareerGoal.status == status_filter)
        
        query = query.order_by(CareerGoal.created_at.desc())
        
        result = await db.execute(query)
        goals = result.scalars().all()
        
        return success_response(
            data=[CareerGoalResponse.model_validate(g) for g in goals]
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch career goals: {str(e)}"
        )


@router.put("/career-goals/{goal_id}")
async def update_career_goal(
    goal_id: UUID,
    goal_data: CareerGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update career goal"""
    try:
        query = select(CareerGoal).where(
            CareerGoal.goal_id == goal_id,
            CareerGoal.employee_id == current_user.employee_id
        )
        result = await db.execute(query)
        goal = result.scalar_one_or_none()
        
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Career goal not found"
            )
        
        # Update fields
        update_data = goal_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(goal, field, value)
        
        # If status changed to achieved, set achieved date
        if goal_data.status == "achieved" and not goal.achieved_date:
            goal.achieved_date = datetime.utcnow().date()
        
        goal.modified_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(goal)
        
        return success_response(
            data=CareerGoalResponse.model_validate(goal),
            message="Career goal updated successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update career goal: {str(e)}"
        )


# ==========================================
# COMPETENCY TRACKING
# ==========================================

@router.post("/competencies", status_code=status.HTTP_201_CREATED)
async def create_competency_assessment(
    competency_data: EmployeeCompetencyCreate,
    employee_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create competency assessment"""
    try:
        target_employee_id = employee_id or current_user.employee_id
        
        competency = EmployeeCompetency(
            employee_id=target_employee_id,
            assessed_by=current_user.employee_id,
            **competency_data.model_dump()
        )
        
        db.add(competency)
        await db.commit()
        await db.refresh(competency)
        
        return success_response(
            data=EmployeeCompetencyResponse.model_validate(competency),
            message="Competency assessment created successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create competency assessment: {str(e)}"
        )


@router.get("/competencies", response_model=List[EmployeeCompetencyResponse])
async def list_competencies(
    employee_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List competency assessments"""
    try:
        target_employee_id = employee_id or current_user.employee_id
        
        query = select(EmployeeCompetency).where(
            EmployeeCompetency.employee_id == target_employee_id
        ).order_by(EmployeeCompetency.assessed_date.desc())
        
        result = await db.execute(query)
        competencies = result.scalars().all()
        
        return success_response(
            data=[EmployeeCompetencyResponse.model_validate(c) for c in competencies]
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch competencies: {str(e)}"
        )


# ==========================================
# DASHBOARD WIDGETS
# ==========================================

@router.post("/widgets", status_code=status.HTTP_201_CREATED)
async def create_dashboard_widget(
    widget_data: DashboardWidgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a dashboard widget (admin only)"""
    try:
        widget = DashboardWidget(
            organization_id=current_user.organization_id,
            is_active=True,
            created_by=current_user.user_id,
            **widget_data.model_dump()
        )
        
        db.add(widget)
        await db.commit()
        await db.refresh(widget)
        
        return success_response(
            data=DashboardWidgetResponse.model_validate(widget),
            message="Dashboard widget created successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create dashboard widget: {str(e)}"
        )


@router.get("/widgets", response_model=List[DashboardWidgetResponse])
async def list_dashboard_widgets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List available dashboard widgets"""
    try:
        query = select(DashboardWidget).where(
            DashboardWidget.organization_id == current_user.organization_id,
            DashboardWidget.is_active == True
        ).order_by(DashboardWidget.widget_name)
        
        result = await db.execute(query)
        widgets = result.scalars().all()
        
        return success_response(
            data=[DashboardWidgetResponse.model_validate(w) for w in widgets]
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard widgets: {str(e)}"
        )


@router.get("/my-dashboard")
async def get_my_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get employee's dashboard configuration"""
    try:
        query = select(EmployeeDashboard).where(
            EmployeeDashboard.employee_id == current_user.employee_id
        )
        result = await db.execute(query)
        dashboard = result.scalar_one_or_none()
        
        if not dashboard:
            # Create default dashboard
            dashboard = EmployeeDashboard(
                employee_id=current_user.employee_id,
                widgets=[],
                theme="light",
                compact_mode=False
            )
            db.add(dashboard)
            await db.commit()
            await db.refresh(dashboard)
        
        return success_response(
            data=EmployeeDashboardResponse.model_validate(dashboard)
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard: {str(e)}"
        )


@router.put("/my-dashboard")
async def update_my_dashboard(
    dashboard_data: EmployeeDashboardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update employee's dashboard configuration"""
    try:
        query = select(EmployeeDashboard).where(
            EmployeeDashboard.employee_id == current_user.employee_id
        )
        result = await db.execute(query)
        dashboard = result.scalar_one_or_none()
        
        if not dashboard:
            # Create new dashboard
            dashboard = EmployeeDashboard(
                employee_id=current_user.employee_id,
                **dashboard_data.model_dump()
            )
            db.add(dashboard)
        else:
            # Update existing dashboard
            update_data = dashboard_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(dashboard, field, value)
            dashboard.modified_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(dashboard)
        
        return success_response(
            data=EmployeeDashboardResponse.model_validate(dashboard),
            message="Dashboard updated successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update dashboard: {str(e)}"
        )


# ==========================================
# QUICK ACTIONS
# ==========================================

@router.post("/quick-actions", status_code=status.HTTP_201_CREATED)
async def create_quick_action(
    action_data: QuickActionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a quick action (admin only)"""
    try:
        action = QuickAction(
            organization_id=current_user.organization_id,
            is_active=True,
            **action_data.model_dump()
        )
        
        db.add(action)
        await db.commit()
        await db.refresh(action)
        
        return success_response(
            data=QuickActionResponse.model_validate(action),
            message="Quick action created successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create quick action: {str(e)}"
        )


@router.get("/quick-actions", response_model=List[QuickActionResponse])
async def list_quick_actions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List available quick actions"""
    try:
        query = select(QuickAction).where(
            QuickAction.organization_id == current_user.organization_id,
            QuickAction.is_active == True
        ).order_by(QuickAction.display_order, QuickAction.action_name)
        
        result = await db.execute(query)
        actions = result.scalars().all()
        
        return success_response(
            data=[QuickActionResponse.model_validate(a) for a in actions]
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch quick actions: {str(e)}"
        )


# ==========================================
# NOTIFICATION PREFERENCES
# ==========================================

@router.get("/notification-preferences")
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get notification preferences"""
    try:
        query = select(NotificationPreference).where(
            NotificationPreference.employee_id == current_user.employee_id
        )
        result = await db.execute(query)
        preferences = result.scalar_one_or_none()
        
        if not preferences:
            # Create default preferences
            preferences = NotificationPreference(
                employee_id=current_user.employee_id,
                email_enabled=True,
                email_frequency="daily",
                push_enabled=True,
                sms_enabled=False,
                leave_notifications=True,
                attendance_notifications=True,
                expense_notifications=True,
                performance_notifications=True,
                announcement_notifications=True,
                recognition_notifications=True,
                quiet_hours_enabled=False
            )
            db.add(preferences)
            await db.commit()
            await db.refresh(preferences)
        
        return success_response(
            data=NotificationPreferenceResponse.model_validate(preferences)
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch notification preferences: {str(e)}"
        )


@router.put("/notification-preferences")
async def update_notification_preferences(
    preferences_data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update notification preferences"""
    try:
        query = select(NotificationPreference).where(
            NotificationPreference.employee_id == current_user.employee_id
        )
        result = await db.execute(query)
        preferences = result.scalar_one_or_none()
        
        if not preferences:
            # Create new preferences
            preferences = NotificationPreference(
                employee_id=current_user.employee_id,
                email_enabled=True,
                email_frequency="daily",
                push_enabled=True,
                sms_enabled=False,
                leave_notifications=True,
                attendance_notifications=True,
                expense_notifications=True,
                performance_notifications=True,
                announcement_notifications=True,
                recognition_notifications=True,
                quiet_hours_enabled=False,
                **preferences_data.model_dump(exclude_unset=True)
            )
            db.add(preferences)
        else:
            # Update existing preferences
            update_data = preferences_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(preferences, field, value)
            preferences.modified_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(preferences)
        
        return success_response(
            data=NotificationPreferenceResponse.model_validate(preferences),
            message="Notification preferences updated successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notification preferences: {str(e)}"
        )


# ==========================================
# LIFECYCLE EVENTS
# ==========================================

@router.post("/lifecycle-events", status_code=status.HTTP_201_CREATED)
async def create_lifecycle_event(
    event_data: EmployeeLifecycleEventCreate,
    employee_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create an employee lifecycle event"""
    try:
        event = EmployeeLifecycleEvent(
            employee_id=employee_id,
            organization_id=current_user.organization_id,
            created_by=current_user.user_id,
            **event_data.model_dump()
        )
        
        db.add(event)
        await db.commit()
        await db.refresh(event)
        
        return success_response(
            data=EmployeeLifecycleEventResponse.model_validate(event),
            message="Lifecycle event created successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create lifecycle event: {str(e)}"
        )


@router.get("/lifecycle-events", response_model=List[EmployeeLifecycleEventResponse])
async def list_lifecycle_events(
    employee_id: Optional[UUID] = Query(None),
    event_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List employee lifecycle events"""
    try:
        target_employee_id = employee_id or current_user.employee_id
        
        query = select(EmployeeLifecycleEvent).where(
            EmployeeLifecycleEvent.employee_id == target_employee_id,
            EmployeeLifecycleEvent.organization_id == current_user.organization_id
        )
        
        if event_type:
            query = query.where(EmployeeLifecycleEvent.event_type == event_type)
        
        query = query.order_by(EmployeeLifecycleEvent.event_date.desc())
        
        result = await paginate(db, query, page, limit)
        
        events = [
            EmployeeLifecycleEventResponse.model_validate(event)
            for event in result["items"]
        ]
        
        return success_response(
            data=events,
            pagination={
                "page": result["page"],
                "limit": result["limit"],
                "total": result["total"],
                "pages": result["pages"]
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch lifecycle events: {str(e)}"
        )
