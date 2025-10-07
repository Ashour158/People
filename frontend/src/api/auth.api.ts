import axios from './axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  organization_name: string;
  organization_code: string;
  username: string;
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
