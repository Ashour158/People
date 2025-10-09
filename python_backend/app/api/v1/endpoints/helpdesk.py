"""
Employee Helpdesk/Ticketing System API endpoints
Support tickets and knowledge base management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import Optional, List
import structlog
from datetime import datetime, timedelta
import uuid

from app.db.database import get_db
from app.schemas.helpdesk import (
    TicketCreate, TicketUpdate, TicketAssign, TicketResolve, TicketClose,
    TicketResponse, TicketListResponse, TicketCommentCreate, TicketCommentResponse,
    TicketSLACreate, TicketSLAResponse, KBCategoryCreate, KBCategoryResponse,
    KBArticleCreate, KBArticleUpdate, KBArticleResponse, KBArticleListResponse,
    TicketStatistics, BaseResponse
)
from app.models.helpdesk import (
    Ticket, TicketComment, TicketHistory, TicketSLA, TicketStatus,
    KnowledgeBaseCategory, KnowledgeBaseArticle
)
from app.middleware.auth import security, AuthMiddleware

router = APIRouter(prefix="/helpdesk", tags=["Helpdesk"])
logger = structlog.get_logger()


# Ticket Endpoints
@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    data: TicketCreate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Create new support ticket"""
    # Generate ticket number
    ticket_number = f"TKT-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Calculate SLA due dates (simplified - should use business hours)
    first_response_due = datetime.utcnow() + timedelta(hours=2)
    resolution_due = datetime.utcnow() + timedelta(hours=24)
    
    ticket = Ticket(
        organization_id=current_user["organization_id"],
        ticket_number=ticket_number,
        employee_id=current_user["employee_id"],
        subject=data.subject,
        description=data.description,
        category=data.category,
        ticket_type=data.ticket_type,
        priority=data.priority,
        status=TicketStatus.OPEN,
        attachments=data.attachments,
        related_entity_type=data.related_entity_type,
        related_entity_id=data.related_entity_id,
        first_response_due=first_response_due,
        resolution_due=resolution_due
    )
    
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    
    # Create history record
    history = TicketHistory(
        ticket_id=ticket.ticket_id,
        action="created",
        new_value=TicketStatus.OPEN.value,
        changed_by=current_user["user_id"]
    )
    db.add(history)
    await db.commit()
    
    logger.info(f"Ticket created: {ticket.ticket_number}")
    return ticket


@router.get("/tickets", response_model=TicketListResponse)
async def list_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_me: bool = False,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """List tickets with filtering"""
    query = select(Ticket).where(
        and_(
            Ticket.organization_id == current_user["organization_id"],
            Ticket.is_deleted == False
        )
    )
    
    # Apply filters
    if status:
        query = query.where(Ticket.status == status)
    if category:
        query = query.where(Ticket.category == category)
    if priority:
        query = query.where(Ticket.priority == priority)
    
    # Access control
    if current_user["role"] in ["admin", "hr_manager"]:
        # Admins/HR can see all tickets
        if assigned_to_me:
            query = query.where(Ticket.assigned_to == current_user["employee_id"])
    else:
        # Regular employees see only their own tickets
        query = query.where(Ticket.employee_id == current_user["employee_id"])
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.order_by(Ticket.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    return TicketListResponse(
        tickets=tickets,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Get ticket by ID"""
    result = await db.execute(
        select(Ticket).where(
            and_(
                Ticket.ticket_id == ticket_id,
                Ticket.organization_id == current_user["organization_id"],
                Ticket.is_deleted == False
            )
        )
    )
    
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check access
    if current_user["role"] not in ["admin", "hr_manager"]:
        if ticket.employee_id != current_user["employee_id"] and ticket.assigned_to != current_user["employee_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    return ticket


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Update ticket"""
    result = await db.execute(
        select(Ticket).where(
            and_(
                Ticket.ticket_id == ticket_id,
                Ticket.organization_id == current_user["organization_id"],
                Ticket.is_deleted == False
            )
        )
    )
    
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Update fields
    old_status = ticket.status
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ticket, field, value)
    
    ticket.modified_at = datetime.utcnow()
    
    # Create history if status changed
    if 'status' in update_data and old_status != ticket.status:
        history = TicketHistory(
            ticket_id=ticket.ticket_id,
            action="status_changed",
            field_changed="status",
            old_value=old_status,
            new_value=ticket.status,
            changed_by=current_user["user_id"]
        )
        db.add(history)
    
    await db.commit()
    await db.refresh(ticket)
    
    return ticket


@router.post("/tickets/{ticket_id}/assign", response_model=BaseResponse)
async def assign_ticket(
    ticket_id: str,
    data: TicketAssign,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Assign ticket to agent"""
    result = await db.execute(
        select(Ticket).where(
            and_(
                Ticket.ticket_id == ticket_id,
                Ticket.organization_id == current_user["organization_id"]
            )
        )
    )
    
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    old_assignee = ticket.assigned_to
    ticket.assigned_to = data.assigned_to
    ticket.assigned_at = datetime.utcnow()
    ticket.assigned_by = current_user["user_id"]
    ticket.status = TicketStatus.IN_PROGRESS
    
    # Create history
    history = TicketHistory(
        ticket_id=ticket.ticket_id,
        action="assigned",
        field_changed="assigned_to",
        old_value=str(old_assignee) if old_assignee else None,
        new_value=str(data.assigned_to),
        changed_by=current_user["user_id"]
    )
    db.add(history)
    
    await db.commit()
    
    return BaseResponse(success=True, message="Ticket assigned successfully")


@router.post("/tickets/{ticket_id}/resolve", response_model=BaseResponse)
async def resolve_ticket(
    ticket_id: str,
    data: TicketResolve,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Resolve ticket"""
    result = await db.execute(
        select(Ticket).where(
            and_(
                Ticket.ticket_id == ticket_id,
                Ticket.organization_id == current_user["organization_id"]
            )
        )
    )
    
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    ticket.status = TicketStatus.RESOLVED
    ticket.resolution = data.resolution
    ticket.resolved_by = current_user["user_id"]
    ticket.resolved_at = datetime.utcnow()
    
    # Create history
    history = TicketHistory(
        ticket_id=ticket.ticket_id,
        action="resolved",
        field_changed="status",
        old_value=ticket.status,
        new_value=TicketStatus.RESOLVED.value,
        changed_by=current_user["user_id"]
    )
    db.add(history)
    
    await db.commit()
    
    logger.info(f"Ticket resolved: {ticket.ticket_number}")
    return BaseResponse(success=True, message="Ticket resolved successfully")


# Ticket Comments
@router.post("/tickets/{ticket_id}/comments", response_model=TicketCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_ticket_comment(
    ticket_id: str,
    data: TicketCommentCreate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Add comment to ticket"""
    # Verify ticket exists
    result = await db.execute(
        select(Ticket).where(
            and_(
                Ticket.ticket_id == ticket_id,
                Ticket.organization_id == current_user["organization_id"]
            )
        )
    )
    
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    comment = TicketComment(
        ticket_id=ticket_id,
        comment_text=data.comment_text,
        is_internal_note=data.is_internal_note,
        is_solution=data.is_solution,
        attachments=data.attachments,
        commented_by=current_user["user_id"]
    )
    
    db.add(comment)
    
    # Update first response time if this is the first comment from support
    if not ticket.first_response_at and current_user["role"] in ["admin", "hr_manager"]:
        ticket.first_response_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(comment)
    
    return comment


@router.get("/tickets/{ticket_id}/comments", response_model=List[TicketCommentResponse])
async def list_ticket_comments(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """List ticket comments"""
    result = await db.execute(
        select(TicketComment).where(
            TicketComment.ticket_id == ticket_id
        ).order_by(TicketComment.commented_at.asc())
    )
    
    comments = result.scalars().all()
    
    # Filter internal notes for non-staff
    if current_user["role"] not in ["admin", "hr_manager"]:
        comments = [c for c in comments if not c.is_internal_note]
    
    return comments


# Knowledge Base Category
@router.post("/kb/categories", response_model=KBCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_kb_category(
    data: KBCategoryCreate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Create knowledge base category"""
    category = KnowledgeBaseCategory(
        organization_id=current_user["organization_id"],
        category_name=data.category_name,
        description=data.description,
        icon=data.icon,
        parent_category_id=data.parent_category_id,
        display_order=data.display_order
    )
    
    db.add(category)
    await db.commit()
    await db.refresh(category)
    
    return category


@router.get("/kb/categories", response_model=List[KBCategoryResponse])
async def list_kb_categories(
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """List KB categories"""
    result = await db.execute(
        select(KnowledgeBaseCategory).where(
            and_(
                KnowledgeBaseCategory.organization_id == current_user["organization_id"],
                KnowledgeBaseCategory.is_active == True
            )
        ).order_by(KnowledgeBaseCategory.display_order)
    )
    
    categories = result.scalars().all()
    return categories


# Knowledge Base Article
@router.post("/kb/articles", response_model=KBArticleResponse, status_code=status.HTTP_201_CREATED)
async def create_kb_article(
    data: KBArticleCreate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Create knowledge base article"""
    # Generate slug from title
    slug = data.title.lower().replace(" ", "-")[:500]
    
    article = KnowledgeBaseArticle(
        organization_id=current_user["organization_id"],
        category_id=data.category_id,
        title=data.title,
        content=data.content,
        summary=data.summary,
        slug=slug,
        keywords=data.keywords,
        attachments=data.attachments,
        is_published=data.is_published,
        published_at=datetime.utcnow() if data.is_published else None,
        author_id=current_user["employee_id"],
        featured=data.featured
    )
    
    db.add(article)
    await db.commit()
    await db.refresh(article)
    
    logger.info(f"KB article created: {article.title}")
    return article


@router.get("/kb/articles", response_model=KBArticleListResponse)
async def list_kb_articles(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    featured_only: bool = False,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """List KB articles"""
    query = select(KnowledgeBaseArticle).where(
        and_(
            KnowledgeBaseArticle.organization_id == current_user["organization_id"],
            KnowledgeBaseArticle.is_published == True
        )
    )
    
    if category_id:
        query = query.where(KnowledgeBaseArticle.category_id == category_id)
    if featured_only:
        query = query.where(KnowledgeBaseArticle.featured == True)
    if search:
        query = query.where(
            or_(
                KnowledgeBaseArticle.title.ilike(f"%{search}%"),
                KnowledgeBaseArticle.content.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.order_by(KnowledgeBaseArticle.published_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    
    result = await db.execute(query)
    articles = result.scalars().all()
    
    return KBArticleListResponse(
        articles=articles,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/kb/articles/{article_id}", response_model=KBArticleResponse)
async def get_kb_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Get KB article by ID"""
    result = await db.execute(
        select(KnowledgeBaseArticle).where(
            and_(
                KnowledgeBaseArticle.article_id == article_id,
                KnowledgeBaseArticle.organization_id == current_user["organization_id"]
            )
        )
    )
    
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
    
    # Increment view count
    article.view_count += 1
    await db.commit()
    
    return article


@router.get("/statistics", response_model=TicketStatistics)
async def get_ticket_statistics(
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Get ticket statistics"""
    query = select(Ticket).where(
        and_(
            Ticket.organization_id == current_user["organization_id"],
            Ticket.is_deleted == False
        )
    )
    
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    resolved_tickets = [t for t in tickets if t.status == TicketStatus.RESOLVED and t.created_at and t.resolved_at]
    avg_resolution_time = None
    if resolved_tickets:
        total_hours = sum(
            (t.resolved_at - t.created_at).total_seconds() / 3600
            for t in resolved_tickets
        )
        avg_resolution_time = total_hours / len(resolved_tickets)
    
    stats = TicketStatistics(
        total_tickets=len(tickets),
        open_tickets=len([t for t in tickets if t.status == TicketStatus.OPEN]),
        in_progress_tickets=len([t for t in tickets if t.status == TicketStatus.IN_PROGRESS]),
        resolved_tickets=len([t for t in tickets if t.status == TicketStatus.RESOLVED]),
        closed_tickets=len([t for t in tickets if t.status == TicketStatus.CLOSED]),
        avg_resolution_time_hours=avg_resolution_time,
        sla_compliance_rate=None,  # TODO: Calculate based on SLA
        avg_satisfaction_rating=None  # TODO: Calculate from ratings
    )
    
    return stats
