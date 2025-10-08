// ============================================
// COMMON TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: string;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

// ============================================
// USER & AUTH TYPES
// ============================================

export interface User {
  user_id: string;
  username: string;
  email: string;
  organization_id: string;
  employee_id?: string;
  roles?: string[];
  permissions?: string[];
  created_at?: string;
  modified_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  organization_name: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refresh_token?: string;
}

// ============================================
// EMPLOYEE TYPES
// ============================================

export interface Employee {
  employee_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  hire_date: string;
  department_id?: string;
  department_name?: string;
  designation_id?: string;
  designation_name?: string;
  reporting_manager_id?: string;
  employment_type?: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  employee_status: 'Active' | 'Inactive' | 'On Leave' | 'Terminated';
  organization_id: string;
  created_at: string;
  modified_at: string;
}

export interface EmployeeFormData {
  employee_code?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  hire_date: string;
  department_id?: string;
  designation_id?: string;
  reporting_manager_id?: string;
  employment_type?: string;
  employee_status?: string;
}

// ============================================
// ATTENDANCE TYPES
// ============================================

export interface Attendance {
  attendance_id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours?: number;
  attendance_status: 'Present' | 'Absent' | 'Half Day' | 'Leave' | 'Holiday';
  location?: string;
  notes?: string;
  organization_id: string;
  created_at: string;
  modified_at: string;
}

export interface CheckInData {
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

export interface CheckOutData {
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

// ============================================
// LEAVE TYPES
// ============================================

export interface LeaveType {
  leave_type_id: string;
  leave_type_name: string;
  description?: string;
  max_days_per_year: number;
  is_paid: boolean;
  requires_approval: boolean;
  organization_id: string;
}

export interface Leave {
  leave_id: string;
  employee_id: string;
  leave_type_id: string;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  leave_reason: string;
  leave_status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  organization_id: string;
  created_at: string;
  modified_at: string;
}

export interface LeaveFormData {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  leave_reason: string;
}

export interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  total_allocated: number;
  total_used: number;
  balance: number;
}

export interface LeaveApprovalData {
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

// ============================================
// DEPARTMENT & DESIGNATION TYPES
// ============================================

export interface Department {
  department_id: string;
  department_name: string;
  description?: string;
  organization_id: string;
}

export interface Designation {
  designation_id: string;
  designation_name: string;
  description?: string;
  organization_id: string;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
}
