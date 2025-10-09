# Models package initialization
from app.models.models import (
    Organization,
    Company,
    User,
    Employee,
    Department,
    Attendance,
    LeaveType,
    LeaveRequest,
)

# Expense Management
from app.models.expense import (
    ExpensePolicy,
    Expense,
    ExpenseComment,
    ExpenseAuditLog,
)

# Helpdesk/Ticketing
from app.models.helpdesk import (
    TicketSLA,
    Ticket,
    TicketComment,
    TicketHistory,
    KnowledgeBaseCategory,
    KnowledgeBaseArticle,
    TicketTemplate,
)

# Wellness Platform
from app.models.wellness import (
    WellnessChallenge,
    ChallengeParticipant,
    ChallengeLeaderboard,
    WellnessActivity,
    HealthMetric,
    WellnessBenefit,
    WellnessBenefitEnrollment,
    BurnoutAssessment,
)

# Document Management & E-signature
from app.models.document import (
    DocumentCategory,
    Document,
    SignatureTemplate,
    DocumentSignature,
    DocumentSigner,
    SignatureAuditTrail,
    DocumentAccessLog,
    DocumentAcknowledgment,
)

# Social & Collaboration
from app.models.social import (
    Announcement,
    AnnouncementComment,
    AnnouncementReaction,
    AnnouncementView,
    Recognition,
    RecognitionComment,
    RecognitionReaction,
    EmployeeSkill,
    SkillEndorsement,
    EmployeeInterest,
    CompanyValue,
    WorkAnniversary,
    Birthday,
)

# Employee Lifecycle & Dashboard
from app.models.employee_lifecycle import (
    EmergencyContact,
    CareerPath,
    CareerGoal,
    EmployeeCompetency,
    SuccessionPlan,
    DashboardWidget,
    EmployeeDashboard,
    QuickAction,
    NotificationPreference,
    EmployeeLifecycleEvent,
)

__all__ = [
    # Core models
    "Organization",
    "Company",
    "User",
    "Employee",
    "Department",
    "Attendance",
    "LeaveType",
    "LeaveRequest",
    # Expense Management
    "ExpensePolicy",
    "Expense",
    "ExpenseComment",
    "ExpenseAuditLog",
    # Helpdesk/Ticketing
    "TicketSLA",
    "Ticket",
    "TicketComment",
    "TicketHistory",
    "KnowledgeBaseCategory",
    "KnowledgeBaseArticle",
    "TicketTemplate",
    # Wellness Platform
    "WellnessChallenge",
    "ChallengeParticipant",
    "ChallengeLeaderboard",
    "WellnessActivity",
    "HealthMetric",
    "WellnessBenefit",
    "WellnessBenefitEnrollment",
    "BurnoutAssessment",
    # Document Management
    "DocumentCategory",
    "Document",
    "SignatureTemplate",
    "DocumentSignature",
    "DocumentSigner",
    "SignatureAuditTrail",
    "DocumentAccessLog",
    "DocumentAcknowledgment",
    # Social & Collaboration
    "Announcement",
    "AnnouncementComment",
    "AnnouncementReaction",
    "AnnouncementView",
    "Recognition",
    "RecognitionComment",
    "RecognitionReaction",
    "EmployeeSkill",
    "SkillEndorsement",
    "EmployeeInterest",
    "CompanyValue",
    "WorkAnniversary",
    "Birthday",
    # Employee Lifecycle
    "EmergencyContact",
    "CareerPath",
    "CareerGoal",
    "EmployeeCompetency",
    "SuccessionPlan",
    "DashboardWidget",
    "EmployeeDashboard",
    "QuickAction",
    "NotificationPreference",
    "EmployeeLifecycleEvent",
]
