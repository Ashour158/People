import {
  object,
  string,
  number,
  boolean,
  array,
  date,
  mixed,
  ref,
  lazy,
  when,
  test,
  ValidationError,
} from 'yup';
import { VALIDATION_RULES } from '../constants';

// ============================================
// AUTH VALIDATION SCHEMAS
// ============================================

export const loginSchema = object().shape({
  email: string()
    .required('Email is required')
    .email('Invalid email format')
    .matches(VALIDATION_RULES.EMAIL_REGEX, 'Invalid email format'),
  password: string()
    .string()
    .required('Password is required')
    .min(
      VALIDATION_RULES.PASSWORD_MIN_LENGTH,
      `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`
    ),
});

export const registerSchema = object().shape({
  username: string()
    .string()
    .required('Username is required')
    .min(
      VALIDATION_RULES.USERNAME_MIN_LENGTH,
      `Username must be at least ${VALIDATION_RULES.USERNAME_MIN_LENGTH} characters`
    )
    .max(
      VALIDATION_RULES.USERNAME_MAX_LENGTH,
      `Username must not exceed ${VALIDATION_RULES.USERNAME_MAX_LENGTH} characters`
    ),
  email: string()
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .matches(VALIDATION_RULES.EMAIL_REGEX, 'Invalid email format'),
  password: string()
    .string()
    .required('Password is required')
    .min(
      VALIDATION_RULES.PASSWORD_MIN_LENGTH,
      `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`
    ),
  confirmPassword: string()
    .string()
    .required('Please confirm your password')
    .oneOf([ref('password')], 'Passwords must match'),
  organization_name: string()
    .string()
    .required('Organization name is required')
    .min(2, 'Organization name must be at least 2 characters'),
  first_name: string()
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  last_name: string()
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
});

// ============================================
// EMPLOYEE VALIDATION SCHEMAS
// ============================================

export const employeeSchema = object().shape({
  employee_code: string().optional(),
  first_name: string()
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  last_name: string()
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  email: string()
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .matches(VALIDATION_RULES.EMAIL_REGEX, 'Invalid email format'),
  phone_number: string()
    .string()
    .optional()
    .matches(VALIDATION_RULES.PHONE_REGEX, 'Invalid phone number format'),
  date_of_birth: string()
    .date()
    .optional()
    .max(new Date(), 'Date of birth cannot be in the future')
    .nullable(),
  gender: string()
    .string()
    .optional()
    .oneOf(['Male', 'Female', 'Other'], 'Invalid gender'),
  address: string().optional().max(200, 'Address is too long'),
  city: string().optional().max(50, 'City name is too long'),
  state: string().optional().max(50, 'State name is too long'),
  country: string().optional().max(50, 'Country name is too long'),
  postal_code: string().optional().max(10, 'Postal code is too long'),
  hire_date: date().required('Hire date is required'),
  department_id: string().optional().nullable(),
  designation_id: string().optional().nullable(),
  reporting_manager_id: string().optional().nullable(),
  employment_type: string()
    .string()
    .optional()
    .oneOf(
      ['Full-time', 'Part-time', 'Contract', 'Intern'],
      'Invalid employment type'
    ),
  employee_status: string()
    .string()
    .optional()
    .oneOf(
      ['Active', 'Inactive', 'On Leave', 'Terminated'],
      'Invalid employee status'
    ),
});

// ============================================
// LEAVE VALIDATION SCHEMAS
// ============================================

export const leaveSchema = object().shape({
  leave_type_id: string().required('Leave type is required'),
  start_date: string()
    .date()
    .required('Start date is required')
    .min(new Date(), 'Start date cannot be in the past'),
  end_date: string()
    .date()
    .required('End date is required')
    .min(ref('start_date'), 'End date must be after start date'),
  leave_reason: string()
    .string()
    .required('Leave reason is required')
    .min(10, 'Leave reason must be at least 10 characters')
    .max(500, 'Leave reason must not exceed 500 characters'),
});

// ============================================
// ATTENDANCE VALIDATION SCHEMAS
// ============================================

export const checkInSchema = object().shape({
  notes: string().optional().max(200, 'Notes must not exceed 200 characters'),
  location: string()
    .object()
    .shape({
      latitude: string()
        .number()
        .min(-90, 'Invalid latitude')
        .max(90, 'Invalid latitude'),
      longitude: string()
        .number()
        .min(-180, 'Invalid longitude')
        .max(180, 'Invalid longitude'),
    })
    .optional()
    .nullable(),
});

export const checkOutSchema = object().shape({
  notes: string().optional().max(200, 'Notes must not exceed 200 characters'),
  location: string()
    .object()
    .shape({
      latitude: string()
        .number()
        .min(-90, 'Invalid latitude')
        .max(90, 'Invalid latitude'),
      longitude: string()
        .number()
        .min(-180, 'Invalid longitude')
        .max(180, 'Invalid longitude'),
    })
    .optional()
    .nullable(),
});

// ============================================
// PERFORMANCE VALIDATION SCHEMAS
// ============================================

export const goalSchema = object().shape({
  title: string()
    .string()
    .required('Goal title is required')
    .min(3, 'Goal title must be at least 3 characters')
    .max(200, 'Goal title must not exceed 200 characters'),
  description: string()
    .string()
    .required('Goal description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  goal_type: string()
    .string()
    .required('Goal type is required')
    .oneOf(['individual', 'team', 'organizational'], 'Invalid goal type'),
  category: string()
    .string()
    .required('Category is required')
    .oneOf(['revenue', 'customer', 'process', 'learning'], 'Invalid category'),
  target_value: string()
    .number()
    .optional()
    .min(0, 'Target value must be positive')
    .nullable(),
  start_date: string()
    .date()
    .required('Start date is required'),
  end_date: string()
    .date()
    .required('End date is required')
    .min(ref('start_date'), 'End date must be after start date'),
  weight: string()
    .number()
    .optional()
    .min(1, 'Weight must be at least 1')
    .max(100, 'Weight must not exceed 100'),
});

export const performanceReviewSchema = object().shape({
  employee_id: string().required('Employee is required'),
  reviewer_id: string().required('Reviewer is required'),
  review_type: string()
    .string()
    .required('Review type is required')
    .oneOf(['self', 'manager', 'peer', 'subordinate', '360'], 'Invalid review type'),
  overall_rating: string()
    .number()
    .optional()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5')
    .nullable(),
  strengths: string()
    .string()
    .optional()
    .max(1000, 'Strengths must not exceed 1000 characters'),
  areas_of_improvement: string()
    .string()
    .optional()
    .max(1000, 'Areas of improvement must not exceed 1000 characters'),
  comments: string()
    .string()
    .optional()
    .max(2000, 'Comments must not exceed 2000 characters'),
});

export const feedbackSchema = object().shape({
  employee_id: string().required('Employee is required'),
  feedback_type: string()
    .string()
    .required('Feedback type is required')
    .oneOf(['praise', 'constructive', 'improvement', 'general'], 'Invalid feedback type'),
  feedback_text: string()
    .string()
    .required('Feedback is required')
    .min(10, 'Feedback must be at least 10 characters')
    .max(1000, 'Feedback must not exceed 1000 characters'),
  is_anonymous: boolean().optional(),
});

// ============================================
// RECRUITMENT VALIDATION SCHEMAS
// ============================================

export const jobPostingSchema = object().shape({
  job_title: string()
    .string()
    .required('Job title is required')
    .min(3, 'Job title must be at least 3 characters')
    .max(100, 'Job title must not exceed 100 characters'),
  department: string()
    .string()
    .required('Department is required'),
  location: string()
    .string()
    .required('Location is required')
    .max(100, 'Location must not exceed 100 characters'),
  job_type: string()
    .string()
    .required('Job type is required')
    .oneOf(['Full-time', 'Part-time', 'Contract', 'Intern', 'Temporary'], 'Invalid job type'),
  experience_level: string()
    .string()
    .required('Experience level is required')
    .oneOf(['Entry Level', 'Mid Level', 'Senior Level', 'Executive'], 'Invalid experience level'),
  openings: string()
    .number()
    .required('Number of openings is required')
    .min(1, 'Must have at least 1 opening')
    .max(100, 'Cannot exceed 100 openings'),
  job_description: string()
    .string()
    .required('Job description is required')
    .min(50, 'Job description must be at least 50 characters')
    .max(5000, 'Job description must not exceed 5000 characters'),
  requirements: string()
    .string()
    .required('Requirements are required')
    .min(20, 'Requirements must be at least 20 characters')
    .max(3000, 'Requirements must not exceed 3000 characters'),
  salary_range_min: string()
    .number()
    .optional()
    .min(0, 'Salary must be positive')
    .nullable(),
  salary_range_max: string()
    .number()
    .optional()
    .min(ref('salary_range_min'), 'Max salary must be greater than min salary')
    .nullable(),
});

export const candidateSchema = object().shape({
  first_name: string()
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  last_name: string()
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  email: string()
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .matches(VALIDATION_RULES.EMAIL_REGEX, 'Invalid email format'),
  phone_number: string()
    .string()
    .optional()
    .matches(VALIDATION_RULES.PHONE_REGEX, 'Invalid phone number format'),
  current_company: string()
    .string()
    .optional()
    .max(100, 'Company name must not exceed 100 characters'),
  current_designation: string()
    .string()
    .optional()
    .max(100, 'Designation must not exceed 100 characters'),
  total_experience_years: string()
    .number()
    .optional()
    .min(0, 'Experience must be positive')
    .max(50, 'Experience must not exceed 50 years')
    .nullable(),
  source: string()
    .string()
    .required('Source is required')
    .oneOf(['referral', 'job_board', 'website', 'social_media', 'agency', 'direct'], 'Invalid source'),
});

export const interviewScheduleSchema = object().shape({
  application_id: string().required('Application is required'),
  interview_type: string()
    .string()
    .required('Interview type is required')
    .oneOf(['phone_screening', 'technical', 'hr', 'managerial', 'panel', 'final'], 'Invalid interview type'),
  interview_date: string()
    .date()
    .required('Interview date is required')
    .min(new Date(), 'Interview date cannot be in the past'),
  duration_minutes: string()
    .number()
    .required('Duration is required')
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration cannot exceed 8 hours'),
  interviewer_ids: string()
    .array()
    .of(string())
    .min(1, 'At least one interviewer is required'),
  location: string()
    .string()
    .optional()
    .max(200, 'Location must not exceed 200 characters'),
  interview_mode: string()
    .string()
    .required('Interview mode is required')
    .oneOf(['in_person', 'video', 'phone'], 'Invalid interview mode'),
});

// ============================================
// PAYROLL VALIDATION SCHEMAS
// ============================================

export const salaryStructureSchema = object().shape({
  employee_id: string().required('Employee is required'),
  effective_from: string()
    .date()
    .required('Effective date is required'),
  basic_salary: string()
    .number()
    .required('Basic salary is required')
    .min(0, 'Basic salary must be positive'),
  hra: string()
    .number()
    .optional()
    .min(0, 'HRA must be positive')
    .nullable(),
  transport_allowance: string()
    .number()
    .optional()
    .min(0, 'Transport allowance must be positive')
    .nullable(),
  special_allowance: string()
    .number()
    .optional()
    .min(0, 'Special allowance must be positive')
    .nullable(),
});

export const bonusSchema = object().shape({
  employee_id: string().required('Employee is required'),
  bonus_type: string()
    .string()
    .required('Bonus type is required')
    .oneOf(['performance', 'festive', 'retention', 'referral', 'other'], 'Invalid bonus type'),
  amount: string()
    .number()
    .required('Bonus amount is required')
    .min(0, 'Bonus amount must be positive'),
  bonus_date: string()
    .date()
    .required('Bonus date is required'),
  reason: string()
    .string()
    .optional()
    .max(500, 'Reason must not exceed 500 characters'),
});

// ============================================
// EXPENSE VALIDATION SCHEMAS
// ============================================

export const expensePolicySchema = object().shape({
  policy_name: string()
    .string()
    .required('Policy name is required')
    .min(3, 'Policy name must be at least 3 characters')
    .max(100, 'Policy name must not exceed 100 characters'),
  category: string()
    .string()
    .required('Category is required')
    .oneOf(['travel', 'food', 'accommodation', 'transport', 'equipment', 'other'], 'Invalid category'),
  max_amount: string()
    .number()
    .required('Maximum amount is required')
    .min(0, 'Maximum amount must be positive'),
  requires_receipt: boolean().required(),
  requires_manager_approval: boolean().required(),
  description: string()
    .string()
    .optional()
    .max(500, 'Description must not exceed 500 characters'),
});

export const expenseSchema = object().shape({
  policy_id: string().required('Policy is required'),
  category: string()
    .string()
    .required('Category is required')
    .oneOf(['travel', 'food', 'accommodation', 'transport', 'equipment', 'other'], 'Invalid category'),
  amount: string()
    .number()
    .required('Amount is required')
    .min(0, 'Amount must be positive')
    .max(1000000, 'Amount seems too high'),
  expense_date: string()
    .date()
    .required('Expense date is required')
    .max(new Date(), 'Expense date cannot be in the future'),
  merchant_name: string()
    .string()
    .required('Merchant name is required')
    .min(2, 'Merchant name must be at least 2 characters')
    .max(100, 'Merchant name must not exceed 100 characters'),
  description: string()
    .string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  has_receipt: boolean().required(),
});

// ============================================
// TIMESHEET VALIDATION SCHEMAS
// ============================================

export const timesheetEntrySchema = object().shape({
  project_id: string().required('Project is required'),
  work_date: string()
    .date()
    .required('Work date is required')
    .max(new Date(), 'Work date cannot be in the future'),
  hours_worked: string()
    .number()
    .required('Hours worked is required')
    .min(0.5, 'Minimum 0.5 hours')
    .max(24, 'Maximum 24 hours per day'),
  is_billable: boolean().required(),
  description: string()
    .string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  task_category: string()
    .string()
    .optional()
    .oneOf(['development', 'testing', 'documentation', 'meeting', 'review', 'other'], 'Invalid task category'),
});

export const projectSchema = object().shape({
  project_name: string()
    .string()
    .required('Project name is required')
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must not exceed 100 characters'),
  project_code: string()
    .string()
    .required('Project code is required')
    .min(2, 'Project code must be at least 2 characters')
    .max(20, 'Project code must not exceed 20 characters'),
  client_name: string()
    .string()
    .optional()
    .max(100, 'Client name must not exceed 100 characters'),
  project_type: string()
    .string()
    .required('Project type is required')
    .oneOf(['internal', 'external', 'billable', 'non_billable'], 'Invalid project type'),
  start_date: string()
    .date()
    .required('Start date is required'),
  end_date: string()
    .date()
    .optional()
    .min(ref('start_date'), 'End date must be after start date')
    .nullable(),
  budget_hours: string()
    .number()
    .optional()
    .min(0, 'Budget hours must be positive')
    .nullable(),
});
