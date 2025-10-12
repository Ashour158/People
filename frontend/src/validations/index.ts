import * as yup from 'yup';

// ============================================
// AUTH VALIDATION SCHEMAS
// ============================================

export const loginSchema = yup.object({
  email: yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  password: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

export const registerSchema = yup.object({
  username: yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters'),
  email: yup.string()
    .required('Email is required')
    .email('Invalid email format'),
  password: yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: yup.string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

export const forgotPasswordSchema = yup.object({
  email: yup.string()
    .email('Invalid email format')
    .required('Email is required'),
});

export const resetPasswordSchema = yup.object({
  password: yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: yup.string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

// ============================================
// EMPLOYEE VALIDATION SCHEMAS
// ============================================

export const employeeSchema = yup.object({
  first_name: yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  last_name: yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  phone: yup.string()
    .matches(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format'),
  job_title: yup.string()
    .required('Job title is required'),
  department_id: yup.string()
    .required('Department is required'),
  hire_date: yup.date()
    .required('Hire date is required'),
  employment_type: yup.string()
    .oneOf(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'], 'Invalid employment type'),
  employment_status: yup.string()
    .oneOf(['ACTIVE', 'INACTIVE', 'TERMINATED'], 'Invalid employment status'),
});

export const employeeUpdateSchema = yup.object({
  first_name: yup.string()
    .min(2, 'First name must be at least 2 characters'),
  last_name: yup.string()
    .min(2, 'Last name must be at least 2 characters'),
  email: yup.string()
    .email('Invalid email format'),
  phone: yup.string()
    .matches(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format'),
  job_title: yup.string(),
  department_id: yup.string(),
  employment_type: yup.string()
    .oneOf(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'], 'Invalid employment type'),
  employment_status: yup.string()
    .oneOf(['ACTIVE', 'INACTIVE', 'TERMINATED'], 'Invalid employment status'),
});

// ============================================
// ATTENDANCE VALIDATION SCHEMAS
// ============================================

export const attendanceSchema = yup.object({
  employee_id: yup.string()
    .required('Employee is required'),
  date: yup.date()
    .required('Date is required'),
  check_in_time: yup.string()
    .required('Check-in time is required'),
  check_out_time: yup.string(),
  status: yup.string()
    .oneOf(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY'], 'Invalid attendance status'),
  notes: yup.string()
    .max(500, 'Notes must not exceed 500 characters'),
});

// ============================================
// LEAVE VALIDATION SCHEMAS
// ============================================

export const leaveRequestSchema = yup.object({
  employee_id: yup.string()
    .required('Employee is required'),
  leave_type: yup.string()
    .required('Leave type is required')
    .oneOf(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY'], 'Invalid leave type'),
  start_date: yup.date()
    .required('Start date is required'),
  end_date: yup.date()
    .required('End date is required')
    .min(yup.ref('start_date'), 'End date must be after start date'),
  reason: yup.string()
    .required('Reason is required')
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must not exceed 500 characters'),
  days_requested: yup.number()
    .required('Days requested is required')
    .min(0.5, 'Minimum 0.5 days')
    .max(30, 'Maximum 30 days per request'),
});

export const leaveApprovalSchema = yup.object({
  status: yup.string()
    .required('Status is required')
    .oneOf(['APPROVED', 'REJECTED'], 'Invalid status'),
  comments: yup.string()
    .max(500, 'Comments must not exceed 500 characters'),
});

// ============================================
// PERFORMANCE VALIDATION SCHEMAS
// ============================================

export const performanceReviewSchema = yup.object({
  employee_id: yup.string()
    .required('Employee is required'),
  reviewer_id: yup.string()
    .required('Reviewer is required'),
  review_period_start: yup.date()
    .required('Review period start is required'),
  review_period_end: yup.date()
    .required('Review period end is required')
    .min(yup.ref('review_period_start'), 'End date must be after start date'),
  overall_rating: yup.number()
    .required('Overall rating is required')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  goals_achieved: yup.number()
    .min(0, 'Goals achieved cannot be negative')
    .max(100, 'Goals achieved cannot exceed 100'),
  comments: yup.string()
    .max(1000, 'Comments must not exceed 1000 characters'),
});

// ============================================
// PAYROLL VALIDATION SCHEMAS
// ============================================

export const payrollSchema = yup.object({
  employee_id: yup.string()
    .required('Employee is required'),
  pay_period_start: yup.date()
    .required('Pay period start is required'),
  pay_period_end: yup.date()
    .required('Pay period end is required')
    .min(yup.ref('pay_period_start'), 'End date must be after start date'),
  basic_salary: yup.number()
    .required('Basic salary is required')
    .min(0, 'Salary cannot be negative'),
  overtime_hours: yup.number()
    .min(0, 'Overtime hours cannot be negative'),
  overtime_rate: yup.number()
    .min(0, 'Overtime rate cannot be negative'),
  deductions: yup.number()
    .min(0, 'Deductions cannot be negative'),
  net_salary: yup.number()
    .required('Net salary is required')
    .min(0, 'Net salary cannot be negative'),
});

// ============================================
// RECRUITMENT VALIDATION SCHEMAS
// ============================================

export const jobPostingSchema = yup.object({
  title: yup.string()
    .required('Job title is required')
    .min(5, 'Title must be at least 5 characters'),
  description: yup.string()
    .required('Job description is required')
    .min(50, 'Description must be at least 50 characters'),
  requirements: yup.string()
    .required('Requirements are required')
    .min(20, 'Requirements must be at least 20 characters'),
  location: yup.string()
    .required('Location is required'),
  employment_type: yup.string()
    .required('Employment type is required')
    .oneOf(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'], 'Invalid employment type'),
  salary_min: yup.number()
    .min(0, 'Minimum salary cannot be negative'),
  salary_max: yup.number()
    .min(yup.ref('salary_min'), 'Maximum salary must be greater than minimum'),
  application_deadline: yup.date()
    .required('Application deadline is required')
    .min(new Date(), 'Deadline must be in the future'),
});

export const candidateSchema = yup.object({
  first_name: yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  last_name: yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  phone: yup.string()
    .matches(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format'),
  resume_url: yup.string()
    .url('Invalid resume URL'),
  cover_letter: yup.string()
    .max(2000, 'Cover letter must not exceed 2000 characters'),
  experience_years: yup.number()
    .min(0, 'Experience cannot be negative'),
  skills: yup.array()
    .of(yup.string())
    .min(1, 'At least one skill is required'),
});

// ============================================
// EXPENSE VALIDATION SCHEMAS
// ============================================

export const expenseSchema = yup.object({
  employee_id: yup.string()
    .required('Employee is required'),
  category: yup.string()
    .required('Category is required')
    .oneOf(['TRAVEL', 'MEALS', 'ACCOMMODATION', 'TRANSPORT', 'OTHER'], 'Invalid category'),
  amount: yup.number()
    .required('Amount is required')
    .min(0.01, 'Amount must be greater than 0'),
  currency: yup.string()
    .required('Currency is required')
    .length(3, 'Currency must be 3 characters'),
  description: yup.string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  expense_date: yup.date()
    .required('Expense date is required')
    .max(new Date(), 'Expense date cannot be in the future'),
  receipt_url: yup.string()
    .url('Invalid receipt URL'),
});

// ============================================
// HELPDESK VALIDATION SCHEMAS
// ============================================

export const ticketSchema = yup.object({
  title: yup.string()
    .required('Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: yup.string()
    .required('Description is required')
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must not exceed 2000 characters'),
  priority: yup.string()
    .required('Priority is required')
    .oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 'Invalid priority'),
  category: yup.string()
    .required('Category is required')
    .oneOf(['TECHNICAL', 'ACCOUNT', 'BILLING', 'FEATURE_REQUEST', 'OTHER'], 'Invalid category'),
  assigned_to: yup.string(),
});

export const ticketUpdateSchema = yup.object({
  status: yup.string()
    .oneOf(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], 'Invalid status'),
  priority: yup.string()
    .oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 'Invalid priority'),
  assigned_to: yup.string(),
  resolution: yup.string()
    .max(1000, 'Resolution must not exceed 1000 characters'),
});

// ============================================
// SURVEY VALIDATION SCHEMAS
// ============================================

export const surveySchema = yup.object({
  title: yup.string()
    .required('Survey title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: yup.string()
    .max(1000, 'Description must not exceed 1000 characters'),
  start_date: yup.date()
    .required('Start date is required'),
  end_date: yup.date()
    .required('End date is required')
    .min(yup.ref('start_date'), 'End date must be after start date'),
  is_anonymous: yup.boolean(),
  target_audience: yup.array()
    .of(yup.string())
    .min(1, 'At least one target audience is required'),
});

export const surveyQuestionSchema = yup.object({
  question_text: yup.string()
    .required('Question text is required')
    .min(10, 'Question must be at least 10 characters')
    .max(500, 'Question must not exceed 500 characters'),
  question_type: yup.string()
    .required('Question type is required')
    .oneOf(['TEXT', 'MULTIPLE_CHOICE', 'RATING', 'YES_NO'], 'Invalid question type'),
  is_required: yup.boolean(),
  options: yup.array()
    .of(yup.string())
    .when('question_type', {
      is: 'MULTIPLE_CHOICE',
      then: (schema) => schema.min(2, 'Multiple choice questions must have at least 2 options'),
      otherwise: (schema) => schema.optional(),
    }),
});

// ============================================
// DOCUMENT VALIDATION SCHEMAS
// ============================================

export const documentSchema = yup.object({
  document_name: yup.string()
    .required('Document name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(200, 'Name must not exceed 200 characters'),
  document_type: yup.string()
    .required('Document type is required')
    .oneOf(['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'IMAGE'], 'Invalid document type'),
  description: yup.string()
    .max(500, 'Description must not exceed 500 characters'),
  is_public: yup.boolean(),
  target_employees: yup.array()
    .of(yup.string()),
  target_departments: yup.array()
    .of(yup.string()),
  target_roles: yup.array()
    .of(yup.string()),
  expiry_date: yup.date()
    .min(new Date(), 'Expiry date must be in the future'),
});

// ============================================
// WORKFLOW VALIDATION SCHEMAS
// ============================================

export const workflowSchema = yup.object({
  name: yup.string()
    .required('Workflow name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  description: yup.string()
    .max(500, 'Description must not exceed 500 characters'),
  trigger_type: yup.string()
    .required('Trigger type is required')
    .oneOf(['MANUAL', 'AUTOMATIC', 'SCHEDULED'], 'Invalid trigger type'),
  is_active: yup.boolean(),
  steps: yup.array()
    .of(yup.object({
      step_name: yup.string().required(),
      step_type: yup.string().required(),
      assignee: yup.string(),
      due_days: yup.number().min(1),
    }))
    .min(1, 'Workflow must have at least one step'),
});

// ============================================
// COMPLIANCE VALIDATION SCHEMAS
// ============================================

export const complianceSchema = yup.object({
  policy_name: yup.string()
    .required('Policy name is required')
    .min(5, 'Name must be at least 5 characters')
    .max(200, 'Name must not exceed 200 characters'),
  policy_type: yup.string()
    .required('Policy type is required')
    .oneOf(['HR', 'IT', 'SECURITY', 'FINANCE', 'OPERATIONAL'], 'Invalid policy type'),
  description: yup.string()
    .required('Description is required')
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must not exceed 2000 characters'),
  effective_date: yup.date()
    .required('Effective date is required'),
  review_date: yup.date()
    .required('Review date is required')
    .min(yup.ref('effective_date'), 'Review date must be after effective date'),
  is_mandatory: yup.boolean(),
  acknowledgment_required: yup.boolean(),
});

// ============================================
// INTEGRATION VALIDATION SCHEMAS
// ============================================

export const integrationSchema = yup.object({
  name: yup.string()
    .required('Integration name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  type: yup.string()
    .required('Integration type is required')
    .oneOf(['API', 'WEBHOOK', 'FILE_SYNC', 'DATABASE'], 'Invalid integration type'),
  endpoint_url: yup.string()
    .url('Invalid endpoint URL'),
  authentication_type: yup.string()
    .oneOf(['API_KEY', 'OAUTH', 'BASIC_AUTH', 'JWT'], 'Invalid authentication type'),
  is_active: yup.boolean(),
  sync_frequency: yup.string()
    .oneOf(['REAL_TIME', 'HOURLY', 'DAILY', 'WEEKLY'], 'Invalid sync frequency'),
});

// ============================================
// ANALYTICS VALIDATION SCHEMAS
// ============================================

export const analyticsQuerySchema = yup.object({
  metric_type: yup.string()
    .required('Metric type is required')
    .oneOf(['ATTENDANCE', 'PERFORMANCE', 'TURNOVER', 'ENGAGEMENT'], 'Invalid metric type'),
  date_range: yup.object({
    start_date: yup.date().required(),
    end_date: yup.date().required(),
  }),
  filters: yup.object({
    department_id: yup.string(),
    employee_id: yup.string(),
    date_range: yup.object({
      start_date: yup.date(),
      end_date: yup.date(),
    }),
  }),
  group_by: yup.array()
    .of(yup.string())
    .min(1, 'At least one group by field is required'),
});

// ============================================
// NOTIFICATION VALIDATION SCHEMAS
// ============================================

export const notificationSchema = yup.object({
  title: yup.string()
    .required('Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters'),
  message: yup.string()
    .required('Message is required')
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must not exceed 1000 characters'),
  type: yup.string()
    .required('Notification type is required')
    .oneOf(['INFO', 'WARNING', 'ERROR', 'SUCCESS'], 'Invalid notification type'),
  priority: yup.string()
    .oneOf(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], 'Invalid priority'),
  target_audience: yup.array()
    .of(yup.string())
    .min(1, 'At least one target audience is required'),
  scheduled_time: yup.date()
    .min(new Date(), 'Scheduled time must be in the future'),
});

// ============================================
// SETTINGS VALIDATION SCHEMAS
// ============================================

export const organizationSettingsSchema = yup.object({
  organization_name: yup.string()
    .required('Organization name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must not exceed 200 characters'),
  timezone: yup.string()
    .required('Timezone is required'),
  currency: yup.string()
    .required('Currency is required')
    .length(3, 'Currency must be 3 characters'),
  working_hours: yup.object({
    start_time: yup.string().required(),
    end_time: yup.string().required(),
    working_days: yup.array()
      .of(yup.string())
      .min(1, 'At least one working day is required'),
  }),
  leave_policy: yup.object({
    annual_leave_days: yup.number()
      .min(0, 'Annual leave days cannot be negative')
      .max(365, 'Annual leave days cannot exceed 365'),
    sick_leave_days: yup.number()
      .min(0, 'Sick leave days cannot be negative')
      .max(365, 'Sick leave days cannot exceed 365'),
    carry_over_limit: yup.number()
      .min(0, 'Carry over limit cannot be negative'),
  }),
});

// ============================================
// USER PREFERENCE VALIDATION SCHEMAS
// ============================================

export const userPreferenceSchema = yup.object({
  theme: yup.string()
    .oneOf(['LIGHT', 'DARK', 'AUTO'], 'Invalid theme'),
  language: yup.string()
    .oneOf(['EN', 'ES', 'FR', 'DE', 'IT', 'PT', 'RU', 'ZH', 'JA', 'KO'], 'Invalid language'),
  timezone: yup.string()
    .required('Timezone is required'),
  email_notifications: yup.boolean(),
  push_notifications: yup.boolean(),
  sms_notifications: yup.boolean(),
  dashboard_layout: yup.string()
    .oneOf(['COMPACT', 'SPACIOUS', 'CUSTOM'], 'Invalid dashboard layout'),
  default_page_size: yup.number()
    .min(10, 'Page size must be at least 10')
    .max(100, 'Page size must not exceed 100'),
});

// ============================================
// AUDIT VALIDATION SCHEMAS
// ============================================

export const auditLogSchema = yup.object({
  action: yup.string()
    .required('Action is required')
    .min(3, 'Action must be at least 3 characters')
    .max(100, 'Action must not exceed 100 characters'),
  entity_type: yup.string()
    .required('Entity type is required')
    .oneOf(['USER', 'EMPLOYEE', 'ATTENDANCE', 'LEAVE', 'PAYROLL'], 'Invalid entity type'),
  entity_id: yup.string()
    .required('Entity ID is required'),
  old_values: yup.object(),
  new_values: yup.object(),
  ip_address: yup.string()
    .matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP address format'),
  user_agent: yup.string()
    .max(500, 'User agent must not exceed 500 characters'),
});

// ============================================
// BACKUP VALIDATION SCHEMAS
// ============================================

export const backupSchema = yup.object({
  backup_name: yup.string()
    .required('Backup name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  backup_type: yup.string()
    .required('Backup type is required')
    .oneOf(['FULL', 'INCREMENTAL', 'DIFFERENTIAL'], 'Invalid backup type'),
  retention_days: yup.number()
    .required('Retention days is required')
    .min(1, 'Retention must be at least 1 day')
    .max(365, 'Retention cannot exceed 365 days'),
  encryption_enabled: yup.boolean(),
  compression_enabled: yup.boolean(),
  schedule: yup.object({
    frequency: yup.string()
      .oneOf(['DAILY', 'WEEKLY', 'MONTHLY'], 'Invalid frequency'),
    time: yup.string()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    day_of_week: yup.number()
      .min(0, 'Day of week must be 0-6')
      .max(6, 'Day of week must be 0-6'),
  }),
});

// ============================================
// SYSTEM HEALTH VALIDATION SCHEMAS
// ============================================

export const systemHealthSchema = yup.object({
  check_type: yup.string()
    .required('Check type is required')
    .oneOf(['DATABASE', 'REDIS', 'API', 'STORAGE', 'NETWORK'], 'Invalid check type'),
  status: yup.string()
    .required('Status is required')
    .oneOf(['HEALTHY', 'WARNING', 'CRITICAL', 'DOWN'], 'Invalid status'),
  response_time: yup.number()
    .min(0, 'Response time cannot be negative'),
  error_count: yup.number()
    .min(0, 'Error count cannot be negative'),
  last_check: yup.date()
    .required('Last check is required'),
  details: yup.object(),
});

// ============================================
// EXPORT VALIDATION SCHEMAS
// ============================================

export const exportSchema = yup.object({
  data_type: yup.string()
    .required('Data type is required')
    .oneOf(['EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'PAYROLL', 'PERFORMANCE'], 'Invalid data type'),
  format: yup.string()
    .required('Format is required')
    .oneOf(['CSV', 'EXCEL', 'PDF', 'JSON'], 'Invalid format'),
  date_range: yup.object({
    start_date: yup.date().required(),
    end_date: yup.date().required(),
  }),
  filters: yup.object({
    department_id: yup.string(),
    employee_id: yup.string(),
    status: yup.string(),
  }),
  include_sensitive_data: yup.boolean(),
});

// ============================================
// IMPORT VALIDATION SCHEMAS
// ============================================

export const importSchema = yup.object({
  data_type: yup.string()
    .required('Data type is required')
    .oneOf(['EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'PAYROLL'], 'Invalid data type'),
  format: yup.string()
    .required('Format is required')
    .oneOf(['CSV', 'EXCEL', 'JSON'], 'Invalid format'),
  file_url: yup.string()
    .url('Invalid file URL'),
  mapping: yup.object({
    source_field: yup.string().required(),
    target_field: yup.string().required(),
  }),
  validation_rules: yup.object({
    skip_duplicates: yup.boolean(),
    update_existing: yup.boolean(),
    create_missing: yup.boolean(),
  }),
});

// ============================================
// API VALIDATION SCHEMAS
// ============================================

export const apiKeySchema = yup.object({
  name: yup.string()
    .required('API key name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  permissions: yup.array()
    .of(yup.string())
    .min(1, 'At least one permission is required'),
  expires_at: yup.date()
    .min(new Date(), 'Expiration date must be in the future'),
  rate_limit: yup.number()
    .min(1, 'Rate limit must be at least 1')
    .max(10000, 'Rate limit cannot exceed 10000'),
});

export const webhookSchema = yup.object({
  name: yup.string()
    .required('Webhook name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  url: yup.string()
    .url('Invalid webhook URL')
    .required('Webhook URL is required'),
  events: yup.array()
    .of(yup.string())
    .min(1, 'At least one event is required'),
  secret: yup.string()
    .min(16, 'Secret must be at least 16 characters'),
  is_active: yup.boolean(),
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const validateForm = async (schema: any, data: any) => {
  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error: any) {
    const errors: Record<string, string> = {};
    error.inner.forEach((err: any) => {
      if (err.path) {
        errors[err.path] = err.message;
      }
    });
    return { isValid: false, errors };
  }
};

export const validateField = async (schema: any, field: string, value: any) => {
  try {
    await schema.validateAt(field, { [field]: value });
    return { isValid: true, error: null };
  } catch (error: any) {
    return { isValid: false, error: error.message };
  }
};
