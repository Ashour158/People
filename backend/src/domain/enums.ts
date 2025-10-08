// =====================================================
// Central Enums for HR System
// Consolidated enumerations for domain models
// =====================================================

// =====================================================
// EMPLOYMENT
// =====================================================

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
  INTERN = 'intern',
  CONSULTANT = 'consultant',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  PROBATION = 'probation',
  NOTICE_PERIOD = 'notice_period',
  TERMINATED = 'terminated',
  RESIGNED = 'resigned',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
}

// =====================================================
// LEAVE
// =====================================================

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum LeaveAccrualFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  NONE = 'none',
}

export enum LeaveTransactionType {
  ALLOCATION = 'allocation',
  USAGE = 'usage',
  ADJUSTMENT = 'adjustment',
  CARRY_FORWARD = 'carry_forward',
  ENCASHMENT = 'encashment',
  REVERSAL = 'reversal',
}

// =====================================================
// ATTENDANCE
// =====================================================

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
  HOLIDAY = 'holiday',
  WEEKEND = 'weekend',
  WORK_FROM_HOME = 'work_from_home',
}

export enum RegularizationType {
  MISSING_CHECK_IN = 'missing_check_in',
  MISSING_CHECK_OUT = 'missing_check_out',
  LATE_ARRIVAL = 'late_arrival',
  EARLY_EXIT = 'early_exit',
  FULL_DAY = 'full_day',
}

export enum RegularizationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// =====================================================
// PAYROLL
// =====================================================

export enum PayrollRunStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  PROCESSING = 'processing',
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum PayrollRunType {
  REGULAR = 'regular',
  ADVANCE = 'advance',
  BONUS = 'bonus',
  FINAL_SETTLEMENT = 'final_settlement',
  OFF_CYCLE = 'off_cycle',
}

export enum CompensationComponentType {
  EARNING = 'earning',
  DEDUCTION = 'deduction',
  BENEFIT = 'benefit',
  ALLOWANCE = 'allowance',
  STATUTORY = 'statutory',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CHEQUE = 'cheque',
  DIGITAL_WALLET = 'digital_wallet',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// =====================================================
// PERFORMANCE
// =====================================================

export enum ReviewType {
  ANNUAL = 'annual',
  SEMI_ANNUAL = 'semi_annual',
  QUARTERLY = 'quarterly',
  PROBATION = 'probation',
  PROMOTION = 'promotion',
  PROJECT_END = 'project_end',
}

export enum ReviewStatus {
  NOT_STARTED = 'not_started',
  SELF_REVIEW = 'self_review',
  MANAGER_REVIEW = 'manager_review',
  PEER_REVIEW = 'peer_review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ON_TRACK = 'on_track',
  AT_RISK = 'at_risk',
  DELAYED = 'delayed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum FeedbackType {
  POSITIVE = 'positive',
  CONSTRUCTIVE = 'constructive',
  GENERAL = 'general',
  PEER = 'peer',
  MANAGER = 'manager',
}

// =====================================================
// RECRUITMENT
// =====================================================

export enum ApplicationStatus {
  APPLIED = 'applied',
  SCREENING = 'screening',
  SHORTLISTED = 'shortlisted',
  INTERVIEWING = 'interviewing',
  OFFERED = 'offered',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum OfferStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum InterviewType {
  PHONE_SCREENING = 'phone_screening',
  VIDEO_CALL = 'video_call',
  IN_PERSON = 'in_person',
  TECHNICAL = 'technical',
  HR = 'hr',
  PANEL = 'panel',
  CASE_STUDY = 'case_study',
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  NO_SHOW = 'no_show',
}

export enum CandidateSource {
  DIRECT_APPLICATION = 'direct_application',
  REFERRAL = 'referral',
  JOB_BOARD = 'job_board',
  RECRUITER = 'recruiter',
  SOCIAL_MEDIA = 'social_media',
  CAMPUS = 'campus',
  AGENCY = 'agency',
}

// =====================================================
// ONBOARDING
// =====================================================

export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
}

export enum OnboardingTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  OVERDUE = 'overdue',
}

export enum OnboardingTaskType {
  DOCUMENTATION = 'documentation',
  SYSTEM_ACCESS = 'system_access',
  TRAINING = 'training',
  ORIENTATION = 'orientation',
  EQUIPMENT = 'equipment',
  INTRODUCTION = 'introduction',
  POLICY_REVIEW = 'policy_review',
}

// =====================================================
// NOTIFICATIONS
// =====================================================

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum NotificationType {
  LEAVE_REQUEST = 'leave_request',
  LEAVE_APPROVAL = 'leave_approval',
  ATTENDANCE_ALERT = 'attendance_alert',
  PAYROLL = 'payroll',
  PERFORMANCE_REVIEW = 'performance_review',
  RECRUITMENT = 'recruitment',
  ONBOARDING = 'onboarding',
  SYSTEM = 'system',
  ANNOUNCEMENT = 'announcement',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

// =====================================================
// ASSETS
// =====================================================

export enum AssetStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  IN_MAINTENANCE = 'in_maintenance',
  RETIRED = 'retired',
  LOST = 'lost',
  DAMAGED = 'damaged',
}

export enum AssetCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  NON_FUNCTIONAL = 'non_functional',
}

export enum MaintenanceType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  INSPECTION = 'inspection',
  REPAIR = 'repair',
  UPGRADE = 'upgrade',
}

// =====================================================
// AUDIT & EVENTS
// =====================================================

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  SUBMIT = 'submit',
  CANCEL = 'cancel',
}

export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

// =====================================================
// GENERAL
// =====================================================

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}
