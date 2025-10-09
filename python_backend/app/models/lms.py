"""
Learning Management System (LMS) Models
Complete LMS with courses, training, certifications, and progress tracking
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class CourseStatus(str, enum.Enum):
    """Course status"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class CourseLevel(str, enum.Enum):
    """Course difficulty level"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class EnrollmentStatus(str, enum.Enum):
    """Enrollment status"""
    ENROLLED = "enrolled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DROPPED = "dropped"
    EXPIRED = "expired"


class LessonType(str, enum.Enum):
    """Lesson content type"""
    VIDEO = "video"
    DOCUMENT = "document"
    QUIZ = "quiz"
    ASSIGNMENT = "assignment"
    INTERACTIVE = "interactive"
    LIVE_SESSION = "live_session"


class AssessmentType(str, enum.Enum):
    """Assessment type"""
    QUIZ = "quiz"
    ASSIGNMENT = "assignment"
    PROJECT = "project"
    EXAM = "exam"


class Course(Base):
    """Training courses"""
    __tablename__ = "lms_courses"
    
    course_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Course details
    course_code = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    thumbnail_url = Column(String(500))
    
    # Categorization
    category = Column(String(100))  # Technical, Soft Skills, Compliance, etc.
    tags = Column(JSON)  # List of tags
    level = Column(SQLEnum(CourseLevel), default=CourseLevel.BEGINNER)
    
    # Course metadata
    status = Column(SQLEnum(CourseStatus), default=CourseStatus.DRAFT)
    duration_hours = Column(Float)  # Total duration in hours
    total_lessons = Column(Integer, default=0)
    passing_score = Column(Integer, default=70)  # Percentage
    
    # Requirements
    prerequisites = Column(JSON)  # List of prerequisite course IDs
    required_for_roles = Column(JSON)  # List of roles that must take this
    is_mandatory = Column(Boolean, default=False)
    
    # Access control
    is_public = Column(Boolean, default=False)
    allowed_departments = Column(JSON)
    allowed_roles = Column(JSON)
    
    # Instructor
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    instructor_name = Column(String(200))
    
    # Engagement
    total_enrollments = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)
    average_rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    
    # Validity
    valid_from = Column(Date)
    valid_until = Column(Date)
    certificate_validity_days = Column(Integer)  # Certificate validity
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    modules = relationship("CourseModule", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("CourseEnrollment", back_populates="course")


class CourseModule(Base):
    """Course modules/chapters"""
    __tablename__ = "lms_course_modules"
    
    module_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("lms_courses.course_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Module details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    module_order = Column(Integer, nullable=False)
    
    # Duration
    duration_hours = Column(Float)
    
    # Requirements
    is_required = Column(Boolean, default=True)
    unlock_after_module_id = Column(UUID(as_uuid=True))  # Sequential unlocking
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module", cascade="all, delete-orphan")


class Lesson(Base):
    """Individual lessons within modules"""
    __tablename__ = "lms_lessons"
    
    lesson_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("lms_course_modules.module_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Lesson details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    lesson_type = Column(SQLEnum(LessonType), nullable=False)
    lesson_order = Column(Integer, nullable=False)
    
    # Content
    content_url = Column(String(1000))  # Video, document URL
    content_text = Column(Text)  # Text content
    content_data = Column(JSON)  # Additional structured content
    
    # Duration
    duration_minutes = Column(Integer)
    
    # Requirements
    is_required = Column(Boolean, default=True)
    passing_criteria = Column(JSON)  # For quizzes/assignments
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    module = relationship("CourseModule", back_populates="lessons")
    progress = relationship("LessonProgress", back_populates="lesson")


class CourseEnrollment(Base):
    """Employee course enrollments"""
    __tablename__ = "lms_enrollments"
    
    enrollment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("lms_courses.course_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Enrollment details
    status = Column(SQLEnum(EnrollmentStatus), default=EnrollmentStatus.ENROLLED)
    enrollment_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Progress
    progress_percentage = Column(Float, default=0.0)
    lessons_completed = Column(Integer, default=0)
    total_time_spent = Column(Integer, default=0)  # in minutes
    
    # Completion
    completed_at = Column(DateTime(timezone=True))
    completion_percentage = Column(Float, default=0.0)
    final_score = Column(Float)
    passed = Column(Boolean, default=False)
    
    # Certificate
    certificate_id = Column(UUID(as_uuid=True))
    certificate_issued_at = Column(DateTime(timezone=True))
    certificate_expires_at = Column(DateTime(timezone=True))
    
    # Deadlines
    due_date = Column(Date)
    extended_until = Column(Date)
    
    # Assignment
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    is_mandatory = Column(Boolean, default=False)
    
    # Metadata
    last_accessed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="enrollments")


class LessonProgress(Base):
    """Individual lesson progress tracking"""
    __tablename__ = "lms_lesson_progress"
    
    progress_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("lms_enrollments.enrollment_id"), nullable=False, index=True)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lms_lessons.lesson_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Progress
    is_started = Column(Boolean, default=False)
    is_completed = Column(Boolean, default=False)
    progress_percentage = Column(Float, default=0.0)
    
    # Time tracking
    time_spent = Column(Integer, default=0)  # in minutes
    last_position = Column(String(50))  # For video progress
    
    # Assessment
    score = Column(Float)
    attempts = Column(Integer, default=0)
    passed = Column(Boolean, default=False)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    last_accessed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    lesson = relationship("Lesson", back_populates="progress")


class Assessment(Base):
    """Course assessments (quizzes, exams, assignments)"""
    __tablename__ = "lms_assessments"
    
    assessment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("lms_courses.course_id"), nullable=False, index=True)
    module_id = Column(UUID(as_uuid=True), ForeignKey("lms_course_modules.module_id"), index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Assessment details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    assessment_type = Column(SQLEnum(AssessmentType), nullable=False)
    
    # Configuration
    total_questions = Column(Integer)
    total_marks = Column(Float)
    passing_marks = Column(Float)
    duration_minutes = Column(Integer)
    
    # Attempts
    max_attempts = Column(Integer, default=3)
    randomize_questions = Column(Boolean, default=False)
    show_answers_after = Column(Boolean, default=True)
    
    # Questions
    questions = Column(JSON)  # List of questions with options and answers
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class AssessmentSubmission(Base):
    """Assessment submissions and scores"""
    __tablename__ = "lms_assessment_submissions"
    
    submission_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("lms_assessments.assessment_id"), nullable=False, index=True)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("lms_enrollments.enrollment_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Submission details
    attempt_number = Column(Integer, default=1)
    answers = Column(JSON)  # User's answers
    
    # Scoring
    score = Column(Float)
    max_score = Column(Float)
    percentage = Column(Float)
    passed = Column(Boolean, default=False)
    
    # Time
    time_taken = Column(Integer)  # in minutes
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at = Column(DateTime(timezone=True))
    
    # Review
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    reviewed_at = Column(DateTime(timezone=True))
    feedback = Column(Text)


class Certificate(Base):
    """Training certificates"""
    __tablename__ = "lms_certificates"
    
    certificate_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("lms_courses.course_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("lms_enrollments.enrollment_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Certificate details
    certificate_number = Column(String(100), unique=True, nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    
    # Scoring
    final_score = Column(Float)
    grade = Column(String(10))  # A, B, C, etc.
    
    # Validity
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    is_valid = Column(Boolean, default=True)
    
    # Certificate file
    certificate_url = Column(String(1000))
    
    # Verification
    verification_code = Column(String(100), unique=True)
    
    # Metadata
    issued_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TrainingCalendar(Base):
    """Scheduled training sessions"""
    __tablename__ = "lms_training_calendar"
    
    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("lms_courses.course_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Session details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    session_type = Column(String(50))  # classroom, virtual, hybrid
    
    # Schedule
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    timezone = Column(String(50))
    
    # Location
    location = Column(String(500))  # Physical location or virtual link
    meeting_link = Column(String(1000))
    meeting_id = Column(String(200))
    meeting_password = Column(String(200))
    
    # Capacity
    max_participants = Column(Integer)
    registered_count = Column(Integer, default=0)
    waitlist_count = Column(Integer, default=0)
    
    # Instructor
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Status
    is_active = Column(Boolean, default=True)
    is_cancelled = Column(Boolean, default=False)
    cancellation_reason = Column(Text)
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class TrainingAttendance(Base):
    """Attendance for training sessions"""
    __tablename__ = "lms_training_attendance"
    
    attendance_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("lms_training_calendar.session_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Registration
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    registration_status = Column(String(50), default="confirmed")  # confirmed, waitlist, cancelled
    
    # Attendance
    attended = Column(Boolean, default=False)
    check_in_time = Column(DateTime(timezone=True))
    check_out_time = Column(DateTime(timezone=True))
    
    # Feedback
    rating = Column(Integer)  # 1-5
    feedback = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LearningPath(Base):
    """Curated learning paths with multiple courses"""
    __tablename__ = "lms_learning_paths"
    
    path_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Path details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    thumbnail_url = Column(String(500))
    
    # Courses in path (ordered list of course IDs)
    courses = Column(JSON)
    total_courses = Column(Integer, default=0)
    total_duration_hours = Column(Float)
    
    # Target audience
    target_roles = Column(JSON)
    target_departments = Column(JSON)
    level = Column(SQLEnum(CourseLevel))
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
