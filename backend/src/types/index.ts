import { Request } from 'express';

export interface IUser {
  user_id: string;
  username: string;
  email: string;
  organization_id: string;
  employee_id?: string;
  roles: string[];
  permissions: string[];
}

export interface IEmployee {
  employee_id: string;
  employee_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone_number?: string;
  organization_id: string;
  company_id: string;
  department_id?: string;
  designation_id?: string;
  employee_status: string;
}

export interface IOrganization {
  organization_id: string;
  organization_name: string;
  organization_code: string;
  subscription_plan: string;
  subscription_status: string;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface FilterParams {
  [key: string]: any;
}
