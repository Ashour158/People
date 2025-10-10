"""
Social and Collaboration API Endpoints
Announcements, recognition, skills directory, and company values
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
from app.models.social import (
    Announcement, AnnouncementComment, AnnouncementReaction, AnnouncementView,
    Recognition, RecognitionComment, RecognitionReaction,
    EmployeeSkill, SkillEndorsement, EmployeeInterest,
    CompanyValue, WorkAnniversary, Birthday
)
from app.schemas.social import (
    AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse,
    RecognitionCreate, RecognitionResponse,
    CommentCreate, CommentResponse,
    ReactionCreate,
    EmployeeSkillCreate, EmployeeSkillResponse,
    SkillEndorsementCreate,
    EmployeeInterestCreate, EmployeeInterestResponse,
    CompanyValueCreate, CompanyValueResponse
)
from app.utils.response import success_response, error_response
from app.utils.pagination import paginate

router = APIRouter(prefix="/social", tags=["social"])


# ==========================================
# ANNOUNCEMENTS
# ==========================================

@router.post("/announcements", status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement_data: AnnouncementCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new announcement"""
    try:
        announcement = Announcement(
            organization_id=current_user.organization_id,
            author_id=current_user.employee_id,
            view_count=0,
            **announcement_data.model_dump()
        )
        
        if announcement_data.is_published:
            announcement.published_at = datetime.utcnow()
        
        db.add(announcement)
        await db.commit()
        await db.refresh(announcement)
        
        return success_response(
            data=AnnouncementResponse.model_validate(announcement),
            message="Announcement created successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create announcement: {str(e)}"
        )


@router.get("/announcements", response_model=List[AnnouncementResponse])
async def list_announcements(
    announcement_type: Optional[str] = Query(None),
    is_pinned: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all announcements"""
    try:
        query = select(Announcement).where(
            Announcement.organization_id == current_user.organization_id,
            Announcement.is_deleted == False,
            Announcement.is_published == True
        )
        
        # Apply filters
        if announcement_type:
            query = query.where(Announcement.announcement_type == announcement_type)
        
        if is_pinned is not None:
            query = query.where(Announcement.is_pinned == is_pinned)
        
        # Order: pinned first, then by published date
        query = query.order_by(
            Announcement.is_pinned.desc(),
            Announcement.published_at.desc()
        )
        
        result = await paginate(db, query, page, limit)
        
        # Add comment and reaction counts
        announcements = []
        for announcement in result["items"]:
            # Get comment count
            comment_count_query = select(func.count()).select_from(AnnouncementComment).where(
                AnnouncementComment.announcement_id == announcement.announcement_id,
                AnnouncementComment.is_deleted == False
            )
            comment_count_result = await db.execute(comment_count_query)
            comment_count = comment_count_result.scalar() or 0
            
            # Get reaction count
            reaction_count_query = select(func.count()).select_from(AnnouncementReaction).where(
                AnnouncementReaction.announcement_id == announcement.announcement_id
            )
            reaction_count_result = await db.execute(reaction_count_query)
            reaction_count = reaction_count_result.scalar() or 0
            
            announcement_dict = announcement.__dict__.copy()
            announcement_dict['comment_count'] = comment_count
            announcement_dict['reaction_count'] = reaction_count
            announcements.append(AnnouncementResponse.model_validate(announcement_dict))
        
        return success_response(
            data=announcements,
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
            detail=f"Failed to fetch announcements: {str(e)}"
        )


@router.get("/announcements/{announcement_id}")
async def get_announcement(
    announcement_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get announcement details"""
    try:
        query = select(Announcement).where(
            Announcement.announcement_id == announcement_id,
            Announcement.organization_id == current_user.organization_id,
            Announcement.is_deleted == False
        )
        result = await db.execute(query)
        announcement = result.scalar_one_or_none()
        
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        
        # Track view
        view_check = select(AnnouncementView).where(
            AnnouncementView.announcement_id == announcement_id,
            AnnouncementView.employee_id == current_user.employee_id
        )
        view_result = await db.execute(view_check)
        existing_view = view_result.scalar_one_or_none()
        
        if not existing_view:
            view = AnnouncementView(
                announcement_id=announcement_id,
                employee_id=current_user.employee_id
            )
            db.add(view)
            announcement.view_count = (announcement.view_count or 0) + 1
            await db.commit()
        
        await db.refresh(announcement)
        
        # Get counts
        comment_count_query = select(func.count()).select_from(AnnouncementComment).where(
            AnnouncementComment.announcement_id == announcement_id,
            AnnouncementComment.is_deleted == False
        )
        comment_count_result = await db.execute(comment_count_query)
        comment_count = comment_count_result.scalar() or 0
        
        reaction_count_query = select(func.count()).select_from(AnnouncementReaction).where(
            AnnouncementReaction.announcement_id == announcement_id
        )
        reaction_count_result = await db.execute(reaction_count_query)
        reaction_count = reaction_count_result.scalar() or 0
        
        announcement_dict = announcement.__dict__.copy()
        announcement_dict['comment_count'] = comment_count
        announcement_dict['reaction_count'] = reaction_count
        
        return success_response(data=AnnouncementResponse.model_validate(announcement_dict))
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch announcement: {str(e)}"
        )


@router.put("/announcements/{announcement_id}")
async def update_announcement(
    announcement_id: UUID,
    announcement_data: AnnouncementUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update announcement"""
    try:
        query = select(Announcement).where(
            Announcement.announcement_id == announcement_id,
            Announcement.organization_id == current_user.organization_id,
            Announcement.is_deleted == False
        )
        result = await db.execute(query)
        announcement = result.scalar_one_or_none()
        
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        
        # Update fields
        update_data = announcement_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(announcement, field, value)
        
        if announcement_data.is_published and not announcement.published_at:
            announcement.published_at = datetime.utcnow()
        
        announcement.modified_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(announcement)
        
        return success_response(
            data=AnnouncementResponse.model_validate(announcement),
            message="Announcement updated successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update announcement: {str(e)}"
        )


@router.post("/announcements/{announcement_id}/publish")
async def publish_announcement(
    announcement_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Publish an announcement"""
    try:
        query = select(Announcement).where(
            Announcement.announcement_id == announcement_id,
            Announcement.organization_id == current_user.organization_id,
            Announcement.is_deleted == False
        )
        result = await db.execute(query)
        announcement = result.scalar_one_or_none()
        
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        
        announcement.is_published = True
        announcement.published_at = datetime.utcnow()
        
        await db.commit()
        
        return success_response(message="Announcement published successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish announcement: {str(e)}"
        )


@router.post("/announcements/{announcement_id}/comments", status_code=status.HTTP_201_CREATED)
async def create_announcement_comment(
    announcement_id: UUID,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a comment to an announcement"""
    try:
        # Verify announcement exists
        ann_query = select(Announcement).where(
            Announcement.announcement_id == announcement_id,
            Announcement.organization_id == current_user.organization_id,
            Announcement.is_deleted == False,
            Announcement.allow_comments == True
        )
        ann_result = await db.execute(ann_query)
        announcement = ann_result.scalar_one_or_none()
        
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found or comments not allowed"
            )
        
        comment = AnnouncementComment(
            announcement_id=announcement_id,
            commented_by=current_user.employee_id,
            **comment_data.model_dump()
        )
        
        db.add(comment)
        await db.commit()
        await db.refresh(comment)
        
        return success_response(
            data=CommentResponse.model_validate(comment),
            message="Comment added successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add comment: {str(e)}"
        )


@router.get("/announcements/{announcement_id}/comments")
async def list_announcement_comments(
    announcement_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List announcement comments"""
    try:
        query = select(AnnouncementComment).where(
            AnnouncementComment.announcement_id == announcement_id,
            AnnouncementComment.is_deleted == False
        ).order_by(AnnouncementComment.commented_at.asc())
        
        result = await paginate(db, query, page, limit)
        
        comments = [
            CommentResponse.model_validate(comment)
            for comment in result["items"]
        ]
        
        return success_response(
            data=comments,
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
            detail=f"Failed to fetch comments: {str(e)}"
        )


@router.post("/announcements/{announcement_id}/reactions", status_code=status.HTTP_201_CREATED)
async def add_announcement_reaction(
    announcement_id: UUID,
    reaction_data: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """React to an announcement"""
    try:
        # Verify announcement exists
        ann_query = select(Announcement).where(
            Announcement.announcement_id == announcement_id,
            Announcement.organization_id == current_user.organization_id,
            Announcement.is_deleted == False,
            Announcement.allow_reactions == True
        )
        ann_result = await db.execute(ann_query)
        announcement = ann_result.scalar_one_or_none()
        
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found or reactions not allowed"
            )
        
        # Check if already reacted
        existing_query = select(AnnouncementReaction).where(
            AnnouncementReaction.announcement_id == announcement_id,
            AnnouncementReaction.employee_id == current_user.employee_id
        )
        existing_result = await db.execute(existing_query)
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            # Update reaction type
            existing.reaction_type = reaction_data.reaction_type
            existing.reacted_at = datetime.utcnow()
            await db.commit()
            return success_response(message="Reaction updated successfully")
        
        reaction = AnnouncementReaction(
            announcement_id=announcement_id,
            employee_id=current_user.employee_id,
            **reaction_data.model_dump()
        )
        
        db.add(reaction)
        await db.commit()
        
        return success_response(message="Reaction added successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add reaction: {str(e)}"
        )


# ==========================================
# EMPLOYEE RECOGNITION
# ==========================================

@router.post("/recognition", status_code=status.HTTP_201_CREATED)
async def create_recognition(
    recognition_data: RecognitionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Give recognition to an employee"""
    try:
        recognition = Recognition(
            organization_id=current_user.organization_id,
            given_by=current_user.employee_id,
            published_at=datetime.utcnow(),
            **recognition_data.model_dump()
        )
        
        db.add(recognition)
        await db.commit()
        await db.refresh(recognition)
        
        return success_response(
            data=RecognitionResponse.model_validate(recognition),
            message="Recognition given successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create recognition: {str(e)}"
        )


@router.get("/recognition", response_model=List[RecognitionResponse])
async def list_recognitions(
    employee_id: Optional[UUID] = Query(None),
    recognition_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List employee recognitions"""
    try:
        query = select(Recognition).where(
            Recognition.organization_id == current_user.organization_id,
            Recognition.is_deleted == False
        )
        
        if employee_id:
            query = query.where(
                or_(
                    Recognition.given_to == employee_id,
                    Recognition.given_by == employee_id
                )
            )
        
        if recognition_type:
            query = query.where(Recognition.recognition_type == recognition_type)
        
        query = query.order_by(Recognition.published_at.desc())
        
        result = await paginate(db, query, page, limit)
        
        # Add comment and reaction counts
        recognitions = []
        for recognition in result["items"]:
            comment_count_query = select(func.count()).select_from(RecognitionComment).where(
                RecognitionComment.recognition_id == recognition.recognition_id,
                RecognitionComment.is_deleted == False
            )
            comment_count_result = await db.execute(comment_count_query)
            comment_count = comment_count_result.scalar() or 0
            
            reaction_count_query = select(func.count()).select_from(RecognitionReaction).where(
                RecognitionReaction.recognition_id == recognition.recognition_id
            )
            reaction_count_result = await db.execute(reaction_count_query)
            reaction_count = reaction_count_result.scalar() or 0
            
            recognition_dict = recognition.__dict__.copy()
            recognition_dict['comment_count'] = comment_count
            recognition_dict['reaction_count'] = reaction_count
            recognitions.append(RecognitionResponse.model_validate(recognition_dict))
        
        return success_response(
            data=recognitions,
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
            detail=f"Failed to fetch recognitions: {str(e)}"
        )


# ==========================================
# EMPLOYEE SKILLS
# ==========================================

@router.post("/skills", status_code=status.HTTP_201_CREATED)
async def add_employee_skill(
    skill_data: EmployeeSkillCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a skill to employee profile"""
    try:
        skill = EmployeeSkill(
            employee_id=current_user.employee_id,
            organization_id=current_user.organization_id,
            endorsement_count=0,
            is_verified=False,
            **skill_data.model_dump()
        )
        
        db.add(skill)
        await db.commit()
        await db.refresh(skill)
        
        return success_response(
            data=EmployeeSkillResponse.model_validate(skill),
            message="Skill added successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add skill: {str(e)}"
        )


@router.get("/skills", response_model=List[EmployeeSkillResponse])
async def list_employee_skills(
    employee_id: Optional[UUID] = Query(None),
    skill_category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List employee skills"""
    try:
        target_employee_id = employee_id or current_user.employee_id
        
        query = select(EmployeeSkill).where(
            EmployeeSkill.employee_id == target_employee_id,
            EmployeeSkill.is_deleted == False
        )
        
        if skill_category:
            query = query.where(EmployeeSkill.skill_category == skill_category)
        
        query = query.order_by(EmployeeSkill.skill_name)
        
        result = await db.execute(query)
        skills = result.scalars().all()
        
        return success_response(
            data=[EmployeeSkillResponse.model_validate(s) for s in skills]
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch skills: {str(e)}"
        )


@router.post("/skills/{skill_id}/endorse", status_code=status.HTTP_201_CREATED)
async def endorse_skill(
    skill_id: UUID,
    endorsement_data: SkillEndorsementCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Endorse an employee's skill"""
    try:
        # Verify skill exists
        skill_query = select(EmployeeSkill).where(
            EmployeeSkill.skill_id == skill_id,
            EmployeeSkill.is_deleted == False
        )
        skill_result = await db.execute(skill_query)
        skill = skill_result.scalar_one_or_none()
        
        if not skill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Skill not found"
            )
        
        # Check if already endorsed
        existing_query = select(SkillEndorsement).where(
            SkillEndorsement.skill_id == skill_id,
            SkillEndorsement.endorsed_by == current_user.employee_id,
            SkillEndorsement.is_deleted == False
        )
        existing_result = await db.execute(existing_query)
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already endorsed this skill"
            )
        
        endorsement = SkillEndorsement(
            skill_id=skill_id,
            employee_id=skill.employee_id,
            endorsed_by=current_user.employee_id,
            organization_id=current_user.organization_id,
            endorsement_comment=endorsement_data.endorsement_comment
        )
        
        db.add(endorsement)
        
        # Increment endorsement count
        skill.endorsement_count = (skill.endorsement_count or 0) + 1
        
        await db.commit()
        
        return success_response(message="Skill endorsed successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to endorse skill: {str(e)}"
        )


# ==========================================
# EMPLOYEE INTERESTS
# ==========================================

@router.post("/interests", status_code=status.HTTP_201_CREATED)
async def add_employee_interest(
    interest_data: EmployeeInterestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add an interest to employee profile"""
    try:
        interest = EmployeeInterest(
            employee_id=current_user.employee_id,
            organization_id=current_user.organization_id,
            **interest_data.model_dump()
        )
        
        db.add(interest)
        await db.commit()
        await db.refresh(interest)
        
        return success_response(
            data=EmployeeInterestResponse.model_validate(interest),
            message="Interest added successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add interest: {str(e)}"
        )


@router.get("/interests", response_model=List[EmployeeInterestResponse])
async def list_employee_interests(
    employee_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List employee interests"""
    try:
        target_employee_id = employee_id or current_user.employee_id
        
        query = select(EmployeeInterest).where(
            EmployeeInterest.employee_id == target_employee_id,
            EmployeeInterest.is_deleted == False
        ).order_by(EmployeeInterest.interest_name)
        
        result = await db.execute(query)
        interests = result.scalars().all()
        
        return success_response(
            data=[EmployeeInterestResponse.model_validate(i) for i in interests]
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch interests: {str(e)}"
        )


# ==========================================
# COMPANY VALUES
# ==========================================

@router.post("/values", status_code=status.HTTP_201_CREATED)
async def create_company_value(
    value_data: CompanyValueCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a company value"""
    try:
        value = CompanyValue(
            organization_id=current_user.organization_id,
            is_active=True,
            **value_data.model_dump()
        )
        
        db.add(value)
        await db.commit()
        await db.refresh(value)
        
        return success_response(
            data=CompanyValueResponse.model_validate(value),
            message="Company value created successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create company value: {str(e)}"
        )


@router.get("/values", response_model=List[CompanyValueResponse])
async def list_company_values(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all company values"""
    try:
        query = select(CompanyValue).where(
            CompanyValue.organization_id == current_user.organization_id,
            CompanyValue.is_active == True
        ).order_by(CompanyValue.display_order, CompanyValue.value_name)
        
        result = await db.execute(query)
        values = result.scalars().all()
        
        return success_response(
            data=[CompanyValueResponse.model_validate(v) for v in values]
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch company values: {str(e)}"
        )


# ==========================================
# CELEBRATIONS (Birthdays & Anniversaries)
# ==========================================

@router.get("/celebrations/birthdays")
async def list_upcoming_birthdays(
    days_ahead: int = Query(7, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List upcoming birthdays"""
    try:
        query = select(Birthday).where(
            Birthday.organization_id == current_user.organization_id,
            Birthday.is_deleted == False
        ).order_by(Birthday.next_birthday.asc()).limit(50)
        
        result = await db.execute(query)
        birthdays = result.scalars().all()
        
        return success_response(data=birthdays)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch birthdays: {str(e)}"
        )


@router.get("/celebrations/anniversaries")
async def list_upcoming_anniversaries(
    days_ahead: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List upcoming work anniversaries"""
    try:
        query = select(WorkAnniversary).where(
            WorkAnniversary.organization_id == current_user.organization_id,
            WorkAnniversary.is_deleted == False
        ).order_by(WorkAnniversary.next_anniversary.asc()).limit(50)
        
        result = await db.execute(query)
        anniversaries = result.scalars().all()
        
        return success_response(data=anniversaries)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch anniversaries: {str(e)}"
        )
