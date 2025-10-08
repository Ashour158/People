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
