import * as yup from 'yup';
import { VALIDATION_RULES } from '../constants';

// ============================================
// AUTH VALIDATION SCHEMAS
// ============================================

export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .matches(VALIDATION_RULES.EMAIL_REGEX, 'Invalid email format'),
  password: yup
    .string()
    .required('Password is required')
    .min(
      VALIDATION_RULES.PASSWORD_MIN_LENGTH,
      `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`
    ),
});

export const registerSchema = yup.object().shape({
  username: yup
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
  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .matches(VALIDATION_RULES.EMAIL_REGEX, 'Invalid email format'),
  password: yup
    .string()
    .required('Password is required')
    .min(
      VALIDATION_RULES.PASSWORD_MIN_LENGTH,
      `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  organization_name: yup
    .string()
    .required('Organization name is required')
    .min(2, 'Organization name must be at least 2 characters'),
  first_name: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  last_name: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
});

// ============================================
// EMPLOYEE VALIDATION SCHEMAS
// ============================================

export const employeeSchema = yup.object().shape({
  employee_code: yup.string().optional(),
  first_name: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  last_name: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .matches(VALIDATION_RULES.EMAIL_REGEX, 'Invalid email format'),
  phone_number: yup
    .string()
    .optional()
    .matches(VALIDATION_RULES.PHONE_REGEX, 'Invalid phone number format'),
  date_of_birth: yup
    .date()
    .optional()
    .max(new Date(), 'Date of birth cannot be in the future')
    .nullable(),
  gender: yup
    .string()
    .optional()
    .oneOf(['Male', 'Female', 'Other'], 'Invalid gender'),
  address: yup.string().optional().max(200, 'Address is too long'),
  city: yup.string().optional().max(50, 'City name is too long'),
  state: yup.string().optional().max(50, 'State name is too long'),
  country: yup.string().optional().max(50, 'Country name is too long'),
  postal_code: yup.string().optional().max(10, 'Postal code is too long'),
  hire_date: yup.date().required('Hire date is required'),
  department_id: yup.string().optional().nullable(),
  designation_id: yup.string().optional().nullable(),
  reporting_manager_id: yup.string().optional().nullable(),
  employment_type: yup
    .string()
    .optional()
    .oneOf(
      ['Full-time', 'Part-time', 'Contract', 'Intern'],
      'Invalid employment type'
    ),
  employee_status: yup
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

export const leaveSchema = yup.object().shape({
  leave_type_id: yup.string().required('Leave type is required'),
  start_date: yup
    .date()
    .required('Start date is required')
    .min(new Date(), 'Start date cannot be in the past'),
  end_date: yup
    .date()
    .required('End date is required')
    .min(yup.ref('start_date'), 'End date must be after start date'),
  leave_reason: yup
    .string()
    .required('Leave reason is required')
    .min(10, 'Leave reason must be at least 10 characters')
    .max(500, 'Leave reason must not exceed 500 characters'),
});

// ============================================
// ATTENDANCE VALIDATION SCHEMAS
// ============================================

export const checkInSchema = yup.object().shape({
  notes: yup.string().optional().max(200, 'Notes must not exceed 200 characters'),
  location: yup
    .object()
    .shape({
      latitude: yup
        .number()
        .min(-90, 'Invalid latitude')
        .max(90, 'Invalid latitude'),
      longitude: yup
        .number()
        .min(-180, 'Invalid longitude')
        .max(180, 'Invalid longitude'),
    })
    .optional()
    .nullable(),
});

export const checkOutSchema = yup.object().shape({
  notes: yup.string().optional().max(200, 'Notes must not exceed 200 characters'),
  location: yup
    .object()
    .shape({
      latitude: yup
        .number()
        .min(-90, 'Invalid latitude')
        .max(90, 'Invalid latitude'),
      longitude: yup
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

export const goalSchema = yup.object().shape({
  title: yup
    .string()
    .required('Goal title is required')
    .min(3, 'Goal title must be at least 3 characters')
    .max(200, 'Goal title must not exceed 200 characters'),
  description: yup
    .string()
    .required('Goal description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  goal_type: yup
    .string()
    .required('Goal type is required')
    .oneOf(['individual', 'team', 'organizational'], 'Invalid goal type'),
  category: yup
    .string()
    .required('Category is required')
    .oneOf(['revenue', 'customer', 'process', 'learning'], 'Invalid category'),
  target_value: yup
    .number()
    .optional()
    .min(0, 'Target value must be positive')
    .nullable(),
  start_date: yup
    .date()
    .required('Start date is required'),
  end_date: yup
    .date()
    .required('End date is required')
    .min(yup.ref('start_date'), 'End date must be after start date'),
  weight: yup
    .number()
    .optional()
    .min(1, 'Weight must be at least 1')
    .max(100, 'Weight must not exceed 100'),
});

export const performanceReviewSchema = yup.object().shape({
  employee_id: yup.string().required('Employee is required'),
  reviewer_id: yup.string().required('Reviewer is required'),
  review_type: yup
    .string()
    .required('Review type is required')
    .oneOf(['self', 'manager', 'peer', 'subordinate', '360'], 'Invalid review type'),
  overall_rating: yup
    .number()
    .optional()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5')
    .nullable(),
  strengths: yup
    .string()
    .optional()
    .max(1000, 'Strengths must not exceed 1000 characters'),
  areas_of_improvement: yup
    .string()
    .optional()
    .max(1000, 'Areas of improvement must not exceed 1000 characters'),
  comments: yup
    .string()
    .optional()
    .max(2000, 'Comments must not exceed 2000 characters'),
});

export const feedbackSchema = yup.object().shape({
  employee_id: yup.string().required('Employee is required'),
  feedback_type: yup
    .string()
    .required('Feedback type is required')
    .oneOf(['praise', 'constructive', 'improvement', 'general'], 'Invalid feedback type'),
  feedback_text: yup
    .string()
    .required('Feedback is required')
    .min(10, 'Feedback must be at least 10 characters')
    .max(1000, 'Feedback must not exceed 1000 characters'),
  is_anonymous: yup.boolean().optional(),
});

// ============================================
// RECRUITMENT VALIDATION SCHEMAS
// ============================================

export const jobPostingSchema = yup.object().shape({
  job_title: yup
    .string()
    .required('Job title is required')
    .min(3, 'Job title must be at least 3 characters')
    .max(100, 'Job title must not exceed 100 characters'),
  department: yup
    .string()
    .required('Department is required'),
  location: yup
    .string()
    .required('Location is required')
    .max(100, 'Location must not exceed 100 characters'),
  job_type: yup
    .string()
    .required('Job type is required')
    .oneOf(['Full-time', 'Part-time', 'Contract', 'Intern', 'Temporary'], 'Invalid job type'),
  experience_level: yup
    .string()
    .required('Experience level is required')
    .oneOf(['Entry Level', 'Mid Level', 'Senior Level', 'Executive'], 'Invalid experience level'),
  openings: yup
    .number()
    .required('Number of openings is required')
    .min(1, 'Must have at least 1 opening')
    .max(100, 'Cannot exceed 100 openings'),
  job_description: yup
    .string()
    .required('Job description is required')
    .min(50, 'Job description must be at least 50 characters')
    .max(5000, 'Job description must not exceed 5000 characters'),
  requirements: yup
    .string()
    .required('Requirements are required')
    .min(20, 'Requirements must be at least 20 characters')
    .max(3000, 'Requirements must not exceed 3000 characters'),
  salary_range_min: yup
    .number()
    .optional()
    .min(0, 'Salary must be positive')
    .nullable(),
  salary_range_max: yup
    .number()
    .optional()
    .min(yup.ref('salary_range_min'), 'Max salary must be greater than min salary')
    .nullable(),
});

export const candidateSchema = yup.object().shape({
  first_name: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  last_name: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .matches(VALIDATION_RULES.EMAIL_REGEX, 'Invalid email format'),
  phone_number: yup
    .string()
    .optional()
    .matches(VALIDATION_RULES.PHONE_REGEX, 'Invalid phone number format'),
  current_company: yup
    .string()
    .optional()
    .max(100, 'Company name must not exceed 100 characters'),
  current_designation: yup
    .string()
    .optional()
    .max(100, 'Designation must not exceed 100 characters'),
  total_experience_years: yup
    .number()
    .optional()
    .min(0, 'Experience must be positive')
    .max(50, 'Experience must not exceed 50 years')
    .nullable(),
  source: yup
    .string()
    .required('Source is required')
    .oneOf(['referral', 'job_board', 'website', 'social_media', 'agency', 'direct'], 'Invalid source'),
});

export const interviewScheduleSchema = yup.object().shape({
  application_id: yup.string().required('Application is required'),
  interview_type: yup
    .string()
    .required('Interview type is required')
    .oneOf(['phone_screening', 'technical', 'hr', 'managerial', 'panel', 'final'], 'Invalid interview type'),
  interview_date: yup
    .date()
    .required('Interview date is required')
    .min(new Date(), 'Interview date cannot be in the past'),
  duration_minutes: yup
    .number()
    .required('Duration is required')
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration cannot exceed 8 hours'),
  interviewer_ids: yup
    .array()
    .of(yup.string())
    .min(1, 'At least one interviewer is required'),
  location: yup
    .string()
    .optional()
    .max(200, 'Location must not exceed 200 characters'),
  interview_mode: yup
    .string()
    .required('Interview mode is required')
    .oneOf(['in_person', 'video', 'phone'], 'Invalid interview mode'),
});

// ============================================
// PAYROLL VALIDATION SCHEMAS
// ============================================

export const salaryStructureSchema = yup.object().shape({
  employee_id: yup.string().required('Employee is required'),
  effective_from: yup
    .date()
    .required('Effective date is required'),
  basic_salary: yup
    .number()
    .required('Basic salary is required')
    .min(0, 'Basic salary must be positive'),
  hra: yup
    .number()
    .optional()
    .min(0, 'HRA must be positive')
    .nullable(),
  transport_allowance: yup
    .number()
    .optional()
    .min(0, 'Transport allowance must be positive')
    .nullable(),
  special_allowance: yup
    .number()
    .optional()
    .min(0, 'Special allowance must be positive')
    .nullable(),
});

export const bonusSchema = yup.object().shape({
  employee_id: yup.string().required('Employee is required'),
  bonus_type: yup
    .string()
    .required('Bonus type is required')
    .oneOf(['performance', 'festive', 'retention', 'referral', 'other'], 'Invalid bonus type'),
  amount: yup
    .number()
    .required('Bonus amount is required')
    .min(0, 'Bonus amount must be positive'),
  bonus_date: yup
    .date()
    .required('Bonus date is required'),
  reason: yup
    .string()
    .optional()
    .max(500, 'Reason must not exceed 500 characters'),
});

// ============================================
// EXPENSE VALIDATION SCHEMAS
// ============================================

export const expensePolicySchema = yup.object().shape({
  policy_name: yup
    .string()
    .required('Policy name is required')
    .min(3, 'Policy name must be at least 3 characters')
    .max(100, 'Policy name must not exceed 100 characters'),
  category: yup
    .string()
    .required('Category is required')
    .oneOf(['travel', 'food', 'accommodation', 'transport', 'equipment', 'other'], 'Invalid category'),
  max_amount: yup
    .number()
    .required('Maximum amount is required')
    .min(0, 'Maximum amount must be positive'),
  requires_receipt: yup.boolean().required(),
  requires_manager_approval: yup.boolean().required(),
  description: yup
    .string()
    .optional()
    .max(500, 'Description must not exceed 500 characters'),
});

export const expenseSchema = yup.object().shape({
  policy_id: yup.string().required('Policy is required'),
  category: yup
    .string()
    .required('Category is required')
    .oneOf(['travel', 'food', 'accommodation', 'transport', 'equipment', 'other'], 'Invalid category'),
  amount: yup
    .number()
    .required('Amount is required')
    .min(0, 'Amount must be positive')
    .max(1000000, 'Amount seems too high'),
  expense_date: yup
    .date()
    .required('Expense date is required')
    .max(new Date(), 'Expense date cannot be in the future'),
  merchant_name: yup
    .string()
    .required('Merchant name is required')
    .min(2, 'Merchant name must be at least 2 characters')
    .max(100, 'Merchant name must not exceed 100 characters'),
  description: yup
    .string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  has_receipt: yup.boolean().required(),
});

// ============================================
// TIMESHEET VALIDATION SCHEMAS
// ============================================

export const timesheetEntrySchema = yup.object().shape({
  project_id: yup.string().required('Project is required'),
  work_date: yup
    .date()
    .required('Work date is required')
    .max(new Date(), 'Work date cannot be in the future'),
  hours_worked: yup
    .number()
    .required('Hours worked is required')
    .min(0.5, 'Minimum 0.5 hours')
    .max(24, 'Maximum 24 hours per day'),
  is_billable: yup.boolean().required(),
  description: yup
    .string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  task_category: yup
    .string()
    .optional()
    .oneOf(['development', 'testing', 'documentation', 'meeting', 'review', 'other'], 'Invalid task category'),
});

export const projectSchema = yup.object().shape({
  project_name: yup
    .string()
    .required('Project name is required')
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must not exceed 100 characters'),
  project_code: yup
    .string()
    .required('Project code is required')
    .min(2, 'Project code must be at least 2 characters')
    .max(20, 'Project code must not exceed 20 characters'),
  client_name: yup
    .string()
    .optional()
    .max(100, 'Client name must not exceed 100 characters'),
  project_type: yup
    .string()
    .required('Project type is required')
    .oneOf(['internal', 'external', 'billable', 'non_billable'], 'Invalid project type'),
  start_date: yup
    .date()
    .required('Start date is required'),
  end_date: yup
    .date()
    .optional()
    .min(yup.ref('start_date'), 'End date must be after start date')
    .nullable(),
  budget_hours: yup
    .number()
    .optional()
    .min(0, 'Budget hours must be positive')
    .nullable(),
});
