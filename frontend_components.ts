// =====================================================
// REACT FRONTEND - COMPLETE IMPLEMENTATION
// =====================================================

// ===== frontend/package.json =====
/*
{
  "name": "hr-management-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "react-query": "^3.39.3",
    "axios": "^1.6.2",
    "zustand": "^4.4.7",
    "@mui/material": "^5.15.0",
    "@mui/x-data-grid": "^6.18.6",
    "@mui/x-date-pickers": "^6.18.6",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "react-hook-form": "^7.49.2",
    "yup": "^1.3.3",
    "date-fns": "^3.0.6",
    "recharts": "^2.10.3",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.8"
  }
}
*/

// ===== src/api/axios.ts =====
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response: any = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const message = error.response?.data?.error || 'An error occurred';
    toast.error(message);

    return Promise.reject(error);
  }
);

export default axiosInstance;

// ===== src/api/auth.api.ts =====
import axios from './axios';

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterData {
  organization_name: string;
  organization_code: string;
  company_name: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
}

export const authApi = {
  login: (credentials: LoginCredentials) => axios.post('/auth/login', credentials),
  
  register: (data: RegisterData) => axios.post('/auth/register', data),
  
  logout: () => axios.post('/auth/logout'),
  
  getCurrentUser: () => axios.get('/auth/me'),
  
  forgotPassword: (email: string) => axios.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, new_password: string) =>
    axios.post('/auth/reset-password', { token, new_password }),
  
  changePassword: (current_password: string, new_password: string) =>
    axios.post('/auth/change-password', { current_password, new_password }),
};

// ===== src/api/employee.api.ts =====
import axios from './axios';

export const employeeApi = {
  getAll: (params?: any) => axios.get('/employees', { params }),
  
  getById: (id: string) => axios.get(`/employees/${id}`),
  
  create: (data: any) => axios.post('/employees', data),
  
  update: (id: string, data: any) => axios.put(`/employees/${id}`, data),
  
  terminate: (id: string, data: any) => axios.post(`/employees/${id}/terminate`, data),
  
  delete: (id: string) => axios.delete(`/employees/${id}`),
  
  getTeam: (id: string) => axios.get(`/employees/${id}/team`),
  
  getStats: (companyId?: string) => axios.get('/employees/stats', { params: { company_id: companyId } }),
};

// ===== src/api/attendance.api.ts =====
import axios from './axios';

export const attendanceApi = {
  checkIn: (data: any) => axios.post('/attendance/check-in', data),
  
  checkOut: (data: any) => axios.post('/attendance/check-out', data),
  
  getAll: (params?: any) => axios.get('/attendance', { params }),
  
  getSummary: (employeeId?: string, params?: any) =>
    axios.get(`/attendance/summary/${employeeId || ''}`, { params }),
  
  getTeam: (date?: string) => axios.get('/attendance/team', { params: { date } }),
  
  regularize: (data: any) => axios.post('/attendance/regularize', data),
  
  processRegularization: (id: string, data: any) =>
    axios.post(`/attendance/regularizations/${id}/process`, data),
};

// ===== src/api/leave.api.ts =====
import axios from './axios';

export const leaveApi = {
  getTypes: (companyId?: string) => axios.get('/leave/types', { params: { company_id: companyId } }),
  
  getBalance: (employeeId?: string, year?: number) =>
    axios.get(`/leave/balance/${employeeId || ''}`, { params: { year } }),
  
  apply: (data: any) => axios.post('/leave/requests', data),
  
  getRequests: (params?: any) => axios.get('/leave/requests', { params }),
  
  process: (id: string, action: 'approve' | 'reject', comments?: string, rejection_reason?: string) =>
    axios.post(`/leave/requests/${id}/process`, { action, comments, rejection_reason }),
  
  cancel: (id: string, cancellation_reason: string) =>
    axios.post(`/leave/requests/${id}/cancel`, { cancellation_reason }),
  
  getPendingApprovals: () => axios.get('/leave/approvals/pending'),
  
  getCalendar: (params?: any) => axios.get('/leave/calendar', { params }),
};

// ===== src/store/authStore.ts =====
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  user_id: string;
  email: string;
  employee_id: string;
  name: string;
  organization_id: string;
  organization_name: string;
  roles: any[];
  permissions: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      
      setUser: (user) => set({ user, isAuthenticated: true }),
      
      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
      },
      
      hasPermission: (permission) => {
        const { user } = get();
        return user?.permissions?.includes(permission) || false;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// ===== src/pages/auth/Login.tsx =====
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';

interface LoginForm {
  email: string;
  password: string;
  remember_me: boolean;
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response: any = await authApi.login(data);
      
      localStorage.setItem('access_token', response.data.tokens.access_token);
      localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
      
      setUser(response.data.user);
      
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" align="center" gutterBottom>
            HR Management System
          </Typography>
          <Typography variant="h6" align="center" color="textSecondary" gutterBottom>
            Sign in to your account
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Email Address"
              margin="normal"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              {...register('password', {
                required: 'Password is required',
              })}
              error={!!errors.password}
              helperText={errors.password?.message}
            />

            <FormControlLabel
              control={<Checkbox {...register('remember_me')} />}
              label="Remember me"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Link to="/forgot-password">Forgot password?</Link>
              <Link to="/register">Don't have an account? Sign up</Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

// ===== src/pages/dashboard/Dashboard.tsx =====
import React from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import { People, Assignment, Event, TrendingUp } from '@mui/icons-material';
import { employeeApi } from '../../api/employee.api';
import { attendanceApi } from '../../api/attendance.api';
import { leaveApi } from '../../api/leave.api';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({
  title,
  value,
  icon,
  color,
}) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const Dashboard: React.FC = () => {
  const { data: employeeStats, isLoading: loadingEmployees } = useQuery(
    'employeeStats',
    () => employeeApi.getStats()
  );

  const { data: attendanceSummary, isLoading: loadingAttendance } = useQuery(
    'attendanceSummary',
    () => attendanceApi.getSummary()
  );

  const { data: pendingApprovals, isLoading: loadingApprovals } = useQuery(
    'pendingApprovals',
    () => leaveApi.getPendingApprovals()
  );

  if (loadingEmployees || loadingAttendance || loadingApprovals) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Employees"
            value={employeeStats?.data?.total_employees || 0}
            icon={<People sx={{ color: 'white' }} />}
            color="#1976d2"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Present Today"
            value={attendanceSummary?.data?.present_days || 0}
            icon={<Assignment sx={{ color: 'white' }} />}
            color="#2e7d32"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals?.data?.length || 0}
            icon={<Event sx={{ color: 'white' }} />}
            color="#ed6c02"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="On Leave"
            value={employeeStats?.data?.on_leave || 0}
            icon={<TrendingUp sx={{ color: 'white' }} />}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {/* Add more dashboard widgets here */}
    </Box>
  );
};

// ===== src/pages/employees/EmployeeList.tsx =====
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Add, Search, Edit, Delete, Visibility } from '@mui/icons-material';
import { employeeApi } from '../../api/employee.api';

export const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery(
    ['employees', page, rowsPerPage, search],
    () =>
      employeeApi.getAll({
        page: page + 1,
        limit: rowsPerPage,
        search,
      })
  );

  const getStatusColor = (status: string) => {
    const colors: any = {
      active: 'success',
      on_probation: 'warning',
      on_leave: 'info',
      terminated: 'error',
    };
    return colors[status] || 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/employees/new')}
        >
          Add Employee
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Designation</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((employee: any) => (
              <TableRow key={employee.employee_id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar src={employee.profile_picture_url} sx={{ mr: 2 }}>
                      {employee.first_name[0]}
                    </Avatar>
                    {employee.full_name}
                  </Box>
                </TableCell>
                <TableCell>{employee.employee_code}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.department_name || '-'}</TableCell>
                <TableCell>{employee.designation_name || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={employee.employee_status}
                    color={getStatusColor(employee.employee_status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/employees/${employee.employee_id}`)}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/employees/${employee.employee_id}/edit`)}
                  >
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={data?.meta?.total || 0}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </TableContainer>
    </Box>
  );
};

// ===== src/pages/attendance/AttendanceCheckIn.tsx =====
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'react-query';
import { toast } from 'react-hot-toast';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Schedule, LocationOn } from '@mui/icons-material';
import { attendanceApi } from '../../api/attendance.api';
import { format } from 'date-fns';

export const AttendanceCheckIn: React.FC = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: todayAttendance, refetch } = useQuery('todayAttendance', () =>
    attendanceApi.getAll({ from_date: format(new Date(), 'yyyy-MM-dd') })
  );

  const checkInMutation = useMutation(attendanceApi.checkIn, {
    onSuccess: () => {
      toast.success('Checked in successfully!');
      refetch();
    },
  });

  const checkOutMutation = useMutation(attendanceApi.checkOut, {
    onSuccess: () => {
      toast.success('Checked out successfully!');
      refetch();
    },
  });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Unable to get location. Please enable location services.');
      }
    );

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = () => {
    if (!location) {
      toast.error('Location not available');
      return;
    }

    checkInMutation.mutate({
      latitude: location.latitude,
      longitude: location.longitude,
      check_in_time: new Date().toISOString(),
    });
  };

  const handleCheckOut = () => {
    const attendance = todayAttendance?.data?.[0];
    if (!attendance) return;

    checkOutMutation.mutate({
      attendance_id: attendance.attendance_id,
      latitude: location?.latitude,
      longitude: location?.longitude,
      check_out_time: new Date().toISOString(),
    });
  };

  const attendance = todayAttendance?.data?.[0];
  const isCheckedIn = attendance && !attendance.check_out_time;

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              {format(currentTime, 'HH:mm:ss')}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </Typography>
          </Box>

          {location && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <LocationOn sx={{ mr: 1 }} />
              <Typography variant="body2" color="textSecondary">
                Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Typography>
            </Box>
          )}

          {attendance && (
            <Box sx={{ mb: 3 }}>
              <Chip
                icon={<CheckCircle />}
                label={`Checked in at ${format(new Date(attendance.check_in_time), 'HH:mm')}`}
                color="success"
                sx={{ mr: 1 }}
              />
              {attendance.check_out_time && (
                <Chip
                  icon={<Schedule />}
                  label={`Checked out at ${format(new Date(attendance.check_out_time), 'HH:mm')}`}
                  color="info"
                />
              )}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            {!isCheckedIn ? (
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleCheckIn}
                disabled={checkInMutation.isLoading || !location}
              >
                {checkInMutation.isLoading ? <CircularProgress size={24} /> : 'Check In'}
              </Button>
            ) : (
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                size="large"
                onClick={handleCheckOut}
                disabled={checkOutMutation.isLoading}
              >
                {checkOutMutation.isLoading ? <CircularProgress size={24} /> : 'Check Out'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// ===== src/pages/leave/LeaveApply.tsx =====
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery } from 'react-query';
import { toast } from 'react-hot-toast';
import {
  Box,
  Paper,
  TextField,
  Button,
  MenuItem,
  Typography,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { leaveApi } from '../../api/leave.api';

interface LeaveForm {
  leave_type_id: string;
  from_date: Date;
  to_date: Date;
  is_half_day: boolean;
  half_day_session?: string;
  reason: string;
  contact_details?: string;
}

export const LeaveApply: React.FC = () => {
  const navigate = useNavigate();
  const { data: leaveTypes } = useQuery('leaveTypes', () => leaveApi.getTypes());

  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<LeaveForm>();
  const isHalfDay = watch('is_half_day');

  const applyMutation = useMutation(leaveApi.apply, {
    onSuccess: () => {
      toast.success('Leave request submitted successfully!');
      navigate('/leave/requests');
    },
  });

  const onSubmit = (data: LeaveForm) => {
    applyMutation.mutate(data);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Apply for Leave
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <TextField
            select
            fullWidth
            label="Leave Type"
            margin="normal"
            {...register('leave_type_id', { required: 'Leave type is required' })}
            error={!!errors.leave_type_id}
            helperText={errors.leave_type_id?.message}
          >
            {leaveTypes?.data?.map((type: any) => (
              <MenuItem key={type.leave_type_id} value={type.leave_type_id}>
                {type.leave_type_name} ({type.default_days_per_year} days)
              </MenuItem>
            ))}
          </TextField>

          <Controller
            name="from_date"
            control={control}
            rules={{ required: 'From date is required' }}
            render={({ field }) => (
              <DatePicker
                label="From Date"
                {...field}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                    error: !!errors.from_date,
                    helperText: errors.from_date?.message,
                  },
                }}
              />
            )}
          />

          <Controller
            name="to_date"
            control={control}
            rules={{ required: 'To date is required' }}
            render={({ field }) => (
              <DatePicker
                label="To Date"
                {...field}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                    error: !!errors.to_date,
                    helperText: errors.to_date?.message,
                  },
                }}
              />
            )}
          />

          <FormControlLabel
            control={<Checkbox {...register('is_half_day')} />}
            label="Half Day"
          />

          {isHalfDay && (
            <TextField
              select
              fullWidth
              label="Half Day Session"
              margin="normal"
              {...register('half_day_session')}
            >
              <MenuItem value="first_half">First Half</MenuItem>
              <MenuItem value="second_half">Second Half</MenuItem>
            </TextField>
          )}

          <TextField
            fullWidth
            label="Reason"
            margin="normal"
            multiline
            rows={4}
            {...register('reason', { required: 'Reason is required' })}
            error={!!errors.reason}
            helperText={errors.reason?.message}
          />

          <TextField
            fullWidth
            label="Contact Details (Optional)"
            margin="normal"
            {...register('contact_details')}
          />

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={applyMutation.isLoading}
            >
              {applyMutation.isLoading ? <CircularProgress size={24} /> : 'Submit'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/leave/requests')}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

// ===== src/App.tsx =====
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { EmployeeList } from './pages/employees/EmployeeList';
import { AttendanceCheckIn } from './pages/attendance/AttendanceCheckIn';
import { LeaveApply } from './pages/leave/LeaveApply';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="employees" element={<EmployeeList />} />
                <Route path="attendance" element={<AttendanceCheckIn />} />
                <Route path="leave/apply" element={<LeaveApply />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" />
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

// ===== src/components/common/ProtectedRoute.tsx =====
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission }) => {
  const { isAuthenticated, hasPermission } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// ===== src/components/layout/Layout.tsx =====
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  return (
    <Box sx={{ display: 'flex' }}>
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          ml: { sm: '240px' },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

// ===== src/components/layout/Header.tsx =====
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import { AccountCircle, Notifications } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth.api';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          HR Management System
        </Typography>

        <IconButton color="inherit" sx={{ mr: 2 }}>
          <Notifications />
        </IconButton>

        <IconButton onClick={handleMenu} color="inherit">
          <Avatar src={user?.profile_picture_url}>
            {user?.name?.[0]}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <MenuItem onClick={() => navigate('/profile')}>Profile</MenuItem>
          <MenuItem onClick={() => navigate('/settings')}>Settings</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

// ===== src/components/layout/Sidebar.tsx =====
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from '@mui/material';
import {
  Dashboard,
  People,
  Schedule,
  Event,
  Assessment,
  Work,
  School,
  HelpOutline,
} from '@mui/icons-material';

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Employees', icon: <People />, path: '/employees' },
  { text: 'Attendance', icon: <Schedule />, path: '/attendance' },
  { text: 'Leave', icon: <Event />, path: '/leave' },
  { text: 'Performance', icon: <Assessment />, path: '/performance' },
  { text: 'Recruitment', icon: <Work />, path: '/recruitment' },
  { text: 'Learning', icon: <School />, path: '/learning' },
  { text: 'Help Desk', icon: <HelpOutline />, path: '/cases' },
];

const drawerWidth = 240;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

// =====================================================
// REACT FRONTEND COMPLETE
// =====================================================