import axios from './axios';
import type {
  Employee,
  EmployeeFormData,
  Attendance,
  CheckInData,
  CheckOutData,
  Leave,
  LeaveType,
  LeaveFormData,
  LeaveBalance,
  LeaveApprovalData,
  ApiResponse,
  PaginationParams,
} from '../types';

export const employeeApi = {
  getAll: (params?: PaginationParams): Promise<ApiResponse<Employee[]>> =>
    axios.get('/employees', { params }),
  getById: (id: string): Promise<ApiResponse<Employee>> =>
    axios.get(`/employees/${id}`),
  create: (data: EmployeeFormData): Promise<ApiResponse<Employee>> =>
    axios.post('/employees', data),
  update: (
    id: string,
    data: Partial<EmployeeFormData>
  ): Promise<ApiResponse<Employee>> => axios.put(`/employees/${id}`, data),
  delete: (id: string): Promise<ApiResponse<null>> =>
    axios.delete(`/employees/${id}`),
};

export const attendanceApi = {
  checkIn: (data?: CheckInData): Promise<ApiResponse<Attendance>> =>
    axios.post('/attendance/check-in', data),
  checkOut: (data?: CheckOutData): Promise<ApiResponse<Attendance>> =>
    axios.post('/attendance/check-out', data),
  getAll: (params?: PaginationParams): Promise<ApiResponse<Attendance[]>> =>
    axios.get('/attendance', { params }),
  requestRegularization: (data: {
    attendance_id: string;
    reason: string;
    requested_time: string;
  }): Promise<ApiResponse<Attendance>> =>
    axios.post('/attendance/regularization', data),
};

export const leaveApi = {
  getTypes: (params?: PaginationParams): Promise<ApiResponse<LeaveType[]>> =>
    axios.get('/leave/types', { params }),
  apply: (data: LeaveFormData): Promise<ApiResponse<Leave>> =>
    axios.post('/leave/apply', data),
  getAll: (params?: PaginationParams): Promise<ApiResponse<Leave[]>> =>
    axios.get('/leave', { params }),
  approveReject: (
    id: string,
    data: LeaveApprovalData
  ): Promise<ApiResponse<Leave>> => axios.post(`/leave/${id}/action`, data),
  getBalance: (employeeId?: string): Promise<ApiResponse<LeaveBalance[]>> =>
    axios.get(
      employeeId ? `/leave/balance/${employeeId}` : '/leave/balance'
    ),
};
