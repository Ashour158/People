// =====================================================
// Validation Schemas
// Zod schemas for domain entity validation
// =====================================================

import { z } from 'zod';
import { 
  EmploymentType, 
  EmployeeStatus,
  PayrollRunType,
  PayrollRunStatus 
} from '../domain/enums';

// =====================================================
// EMPLOYEE SCHEMAS
// =====================================================

export const employeeCreateSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  company_id: z.string().uuid().optional(),
  employee_code: z.string().min(1).max(50),
  first_name: z.string().min(1).max(100),
  middle_name: z.string().max(100).optional(),
  last_name: z.string().min(1).max(100),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().max(20).optional(),
  date_of_birth: z.string().or(z.date()).optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  department_id: z.string().uuid().optional(),
  designation_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  reporting_manager_id: z.string().uuid().optional(),
  hire_date: z.string().or(z.date()),
  employment_type: z.nativeEnum(EmploymentType),
  employment_status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ACTIVE),
});

export const employeeUpdateSchema = employeeCreateSchema.partial().omit({
  organization_id: true,
});

// =====================================================
// LEAVE SCHEMAS
// =====================================================

export const leaveRequestCreateSchema = z.object({
  organization_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  leave_type_id: z.string().uuid(),
  start_date: z.string().or(z.date()),
  end_date: z.string().or(z.date()),
  total_days: z.number().positive('Total days must be positive'),
  reason: z.string().min(1).max(1000),
  emergency_contact: z.string().max(200).optional(),
}).refine((data) => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return start <= end;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['start_date'],
});

export const leaveApprovalSchema = z.object({
  approver_id: z.string().uuid(),
  comments: z.string().max(500).optional(),
});

export const leaveRejectionSchema = z.object({
  rejector_id: z.string().uuid(),
  rejection_reason: z.string().min(1).max(500),
});

// =====================================================
// PAYROLL SCHEMAS
// =====================================================

export const payrollRunCreateSchema = z.object({
  organization_id: z.string().uuid(),
  company_id: z.string().uuid().optional(),
  period_year: z.number().int().min(2000).max(2100),
  period_month: z.number().int().min(1).max(12),
  pay_period_start: z.string().or(z.date()),
  pay_period_end: z.string().or(z.date()),
  payment_date: z.string().or(z.date()).optional(),
  run_name: z.string().max(200).optional(),
  run_type: z.nativeEnum(PayrollRunType).default(PayrollRunType.REGULAR),
}).refine((data) => {
  const start = new Date(data.pay_period_start);
  const end = new Date(data.pay_period_end);
  return start <= end;
}, {
  message: 'Pay period start must be before or equal to end date',
  path: ['pay_period_start'],
});

export const payrollRunUpdateSchema = z.object({
  status: z.nativeEnum(PayrollRunStatus).optional(),
  payment_date: z.string().or(z.date()).optional(),
  total_employees: z.number().int().nonnegative().optional(),
  total_gross: z.number().nonnegative().optional(),
  total_deductions: z.number().nonnegative().optional(),
  total_net: z.number().nonnegative().optional(),
});

// =====================================================
// COMMON SCHEMAS
// =====================================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export const dateRangeSchema = z.object({
  start_date: z.string().or(z.date()),
  end_date: z.string().or(z.date()),
}).refine((data) => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return start <= end;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['start_date'],
});

// =====================================================
// EXPORT TYPES
// =====================================================

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type LeaveRequestCreateInput = z.infer<typeof leaveRequestCreateSchema>;
export type LeaveApprovalInput = z.infer<typeof leaveApprovalSchema>;
export type PayrollRunCreateInput = z.infer<typeof payrollRunCreateSchema>;
export type PayrollRunUpdateInput = z.infer<typeof payrollRunUpdateSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
