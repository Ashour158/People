"""
Social and Collaboration Features Models
News feed, recognition, announcements, and employee directory
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class AnnouncementType(str, enum.Enum):
    """Announcement types"""
    GENERAL = "general"
    POLICY = "policy"
    EVENT = "event"
    CELEBRATION = "celebration"
    URGENT = "urgent"
    SYSTEM = "system"


class AnnouncementPriority(str, enum.Enum):
    """Announcement priority"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class RecognitionType(str, enum.Enum):
    """Recognition types"""
    KUDOS = "kudos"
    THANK_YOU = "thank_you"
    AWARD = "award"
    MILESTONE = "milestone"
    PEER_RECOGNITION = "peer_recognition"
    MANAGER_RECOGNITION = "manager_recognition"


class PostVisibility(str, enum.Enum):
    """Post visibility levels"""
    PUBLIC = "public"
    DEPARTMENT = "department"
    TEAM = "team"
    PRIVATE = "private"


class Announcement(Base):
    """Company announcements and news"""
    __tablename__ = "announcements"
    
    announcement_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Announcement details
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    announcement_type = Column(SQLEnum(AnnouncementType), default=AnnouncementType.GENERAL, index=True)
    priority = Column(SQLEnum(AnnouncementPriority), default=AnnouncementPriority.MEDIUM)
    
    # Visibility
    is_published = Column(Boolean, default=False, index=True)
    published_at = Column(DateTime(timezone=True))
    
    # Targeting
    target_all = Column(Boolean, default=True)
    target_departments = Column(JSON)  # Array of department IDs
    target_locations = Column(JSON)
    target_employees = Column(JSON)  # Array of employee IDs
    
    # Media
    banner_image_url = Column(String(1000))
    attachments = Column(JSON)  # Array of file URLs
    
    # Display settings
    is_pinned = Column(Boolean, default=False)
    pinned_until = Column(DateTime(timezone=True))
    show_on_login = Column(Boolean, default=False)
    
    # Expiry
    expires_at = Column(DateTime(timezone=True))
    
    # Engagement
    allow_comments = Column(Boolean, default=True)
    allow_reactions = Column(Boolean, default=True)
    
    # Author
    author_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False)
    
    # Metadata
    view_count = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    comments = relationship("AnnouncementComment", back_populates="announcement", cascade="all, delete-orphan")
    reactions = relationship("AnnouncementReaction", back_populates="announcement", cascade="all, delete-orphan")
    views = relationship("AnnouncementView", back_populates="announcement", cascade="all, delete-orphan")


class AnnouncementComment(Base):
    """Comments on announcements"""
    __tablename__ = "announcement_comments"
    
    comment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    announcement_id = Column(UUID(as_uuid=True), ForeignKey("announcements.announcement_id"), nullable=False, index=True)
    
    comment_text = Column(Text, nullable=False)
    parent_comment_id = Column(UUID(as_uuid=True), ForeignKey("announcement_comments.comment_id"))
    
    # Author
    commented_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False)
    commented_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Moderation
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True))
    
    # Relationships
    announcement = relationship("Announcement", back_populates="comments")


class AnnouncementReaction(Base):
    """Reactions to announcements"""
    __tablename__ = "announcement_reactions"
    
    reaction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    announcement_id = Column(UUID(as_uuid=True), ForeignKey("announcements.announcement_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    reaction_type = Column(String(50), nullable=False)  # like, love, celebrate, insightful
    reacted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    announcement = relationship("Announcement", back_populates="reactions")


class AnnouncementView(Base):
    """Track announcement views"""
    __tablename__ = "announcement_views"
    
    view_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    announcement_id = Column(UUID(as_uuid=True), ForeignKey("announcements.announcement_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    announcement = relationship("Announcement", back_populates="views")


class Recognition(Base):
    """Employee recognition and kudos"""
    __tablename__ = "recognitions"
    
    recognition_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Recognition details
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    recognition_type = Column(SQLEnum(RecognitionType), nullable=False, index=True)
    
    # People involved
    given_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    given_to = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    # Values/competencies recognized
    values = Column(JSON)  # Array of company values
    competencies = Column(JSON)
    
    # Visibility
    visibility = Column(SQLEnum(PostVisibility), default=PostVisibility.PUBLIC)
    is_published = Column(Boolean, default=True)
    published_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Rewards
    has_reward = Column(Boolean, default=False)
    reward_points = Column(Integer, default=0)
    reward_description = Column(Text)
    
    # Media
    badge_image_url = Column(String(1000))
    
    # Engagement
    allow_comments = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    comments = relationship("RecognitionComment", back_populates="recognition", cascade="all, delete-orphan")
    reactions = relationship("RecognitionReaction", back_populates="recognition", cascade="all, delete-orphan")


class RecognitionComment(Base):
    """Comments on recognition posts"""
    __tablename__ = "recognition_comments"
    
    comment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recognition_id = Column(UUID(as_uuid=True), ForeignKey("recognitions.recognition_id"), nullable=False, index=True)
    
    comment_text = Column(Text, nullable=False)
    
    commented_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False)
    commented_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    recognition = relationship("Recognition", back_populates="comments")


class RecognitionReaction(Base):
    """Reactions to recognition posts"""
    __tablename__ = "recognition_reactions"
    
    reaction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recognition_id = Column(UUID(as_uuid=True), ForeignKey("recognitions.recognition_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    reaction_type = Column(String(50), nullable=False)  # clap, heart, star
    reacted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    recognition = relationship("Recognition", back_populates="reactions")


class EmployeeSkill(Base):
    """Employee skills and expertise for directory"""
    __tablename__ = "employee_skills"
    
    skill_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    skill_name = Column(String(200), nullable=False, index=True)
    skill_category = Column(String(100))  # technical, soft_skill, language, etc.
    proficiency_level = Column(String(50))  # beginner, intermediate, advanced, expert
    
    years_of_experience = Column(Integer)
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    verified_at = Column(DateTime(timezone=True))
    
    # Endorsements
    endorsement_count = Column(Integer, default=0)
    
    # Visibility
    is_visible = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class SkillEndorsement(Base):
    """Skill endorsements from colleagues"""
    __tablename__ = "skill_endorsements"
    
    endorsement_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("employee_skills.skill_id"), nullable=False, index=True)
    
    endorsed_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False)
    endorsement_comment = Column(Text)
    
    endorsed_at = Column(DateTime(timezone=True), server_default=func.now())


class EmployeeInterest(Base):
    """Employee interests and hobbies for social connection"""
    __tablename__ = "employee_interests"
    
    interest_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    interest_name = Column(String(200), nullable=False)
    interest_category = Column(String(100))  # sports, music, reading, travel, etc.
    
    is_visible = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CompanyValue(Base):
    """Company values for recognition"""
    __tablename__ = "company_values"
    
    value_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    value_name = Column(String(200), nullable=False)
    description = Column(Text)
    icon = Column(String(100))
    
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class WorkAnniversary(Base):
    """Track and celebrate work anniversaries"""
    __tablename__ = "work_anniversaries"
    
    anniversary_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    anniversary_date = Column(Date, nullable=False, index=True)
    years_of_service = Column(Integer, nullable=False)
    
    # Notification
    notification_sent = Column(Boolean, default=False)
    notification_sent_at = Column(DateTime(timezone=True))
    
    # Recognition
    recognition_created = Column(Boolean, default=False)
    recognition_id = Column(UUID(as_uuid=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Birthday(Base):
    """Track employee birthdays for celebrations"""
    __tablename__ = "birthdays"
    
    birthday_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, unique=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    birth_date = Column(Date, nullable=False)
    
    # Visibility
    is_visible = Column(Boolean, default=True)
    
    # Notification preferences
    notify_manager = Column(Boolean, default=True)
    notify_team = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
