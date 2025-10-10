import { http, HttpResponse } from 'msw';
import { mockEmployee, mockAttendance, mockLeaveRequest, mockUser } from '../test-utils';

const API_BASE_URL = '/api/v1';

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE_URL}/auth/login`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'Bearer',
      user: mockUser,
    });
  }),

  http.get(`${API_BASE_URL}/auth/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // Employee endpoints
  http.get(`${API_BASE_URL}/employees`, () => {
    return HttpResponse.json({
      employees: [mockEmployee],
      total: 1,
      page: 1,
      limit: 10,
    });
  }),

  http.get(`${API_BASE_URL}/employees/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockEmployee, employee_id: params.id });
  }),

  http.post(`${API_BASE_URL}/employees`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockEmployee,
      ...body,
      employee_id: 'EMP-NEW',
    }, { status: 201 });
  }),

  // Attendance endpoints
  http.get(`${API_BASE_URL}/attendance`, () => {
    return HttpResponse.json({
      attendance_records: [mockAttendance],
      total: 1,
      page: 1,
      limit: 10,
    });
  }),

  http.post(`${API_BASE_URL}/attendance/check-in`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockAttendance,
      ...body,
      attendance_id: 'ATT-NEW',
      check_in: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Leave endpoints
  http.get(`${API_BASE_URL}/leave/requests`, () => {
    return HttpResponse.json({
      leave_requests: [mockLeaveRequest],
      total: 1,
      page: 1,
      limit: 10,
    });
  }),

  http.post(`${API_BASE_URL}/leave/requests`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockLeaveRequest,
      ...body,
      leave_id: 'LV-NEW',
      status: 'PENDING',
    }, { status: 201 });
  }),

  // Dashboard/Analytics endpoints
  http.get(`${API_BASE_URL}/analytics/dashboard`, () => {
    return HttpResponse.json({
      total_employees: 100,
      present_today: 85,
      on_leave: 10,
      absent: 5,
      pending_leave_requests: 3,
      attendance_rate: 85.5,
    });
  }),
];
