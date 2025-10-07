import axios from './axios';

export const employeeApi = {
  getAll: (params?: any) => axios.get('/employees', { params }),
  getById: (id: string) => axios.get(`/employees/${id}`),
  create: (data: any) => axios.post('/employees', data),
  update: (id: string, data: any) => axios.put(`/employees/${id}`, data),
  delete: (id: string) => axios.delete(`/employees/${id}`),
};

export const attendanceApi = {
  checkIn: (data?: any) => axios.post('/attendance/check-in', data),
  checkOut: (data?: any) => axios.post('/attendance/check-out', data),
  getAll: (params?: any) => axios.get('/attendance', { params }),
  requestRegularization: (data: any) => axios.post('/attendance/regularization', data),
};

export const leaveApi = {
  getTypes: (params?: any) => axios.get('/leave/types', { params }),
  apply: (data: any) => axios.post('/leave/apply', data),
  getAll: (params?: any) => axios.get('/leave', { params }),
  approveReject: (id: string, data: any) => axios.post(`/leave/${id}/action`, data),
  getBalance: (employeeId?: string) => 
    axios.get(employeeId ? `/leave/balance/${employeeId}` : '/leave/balance'),
};
