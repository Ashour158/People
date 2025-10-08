// =====================================================
// Domain Entities: Additional Core Entities (Lightweight Interfaces)
// =====================================================

import { 
  ReviewType, 
  ReviewStatus, 
  ApplicationStatus, 
  AssetStatus, 
  NotificationType 
} from './enums';

// =====================================================
// NOTIFICATION TEMPLATE
// =====================================================

export interface NotificationTemplate {
  template_id: string;
  organization_id: string;
  template_name: string;
  template_code: string;
  notification_type: NotificationType;
  subject?: string;
  body_template: string;
  variables?: Record<string, any>;
  supports_email?: boolean;
  supports_sms?: boolean;
  supports_push?: boolean;
  supports_in_app?: boolean;
  is_active?: boolean;
}

// =====================================================
// PERFORMANCE CYCLE
// =====================================================

export interface PerformanceCycle {
  cycle_id: string;
  organization_id: string;
  cycle_name: string;
  cycle_year: number;
  start_date: Date;
  end_date: Date;
  review_type: ReviewType;
  self_review_enabled?: boolean;
  manager_review_enabled?: boolean;
  peer_review_enabled?: boolean;
  status?: ReviewStatus;
  is_active?: boolean;
}

// =====================================================
// JOB REQUISITION
// =====================================================

export interface JobRequisition {
  requisition_id: string;
  organization_id: string;
  company_id?: string;
  job_title: string;
  department_id?: string;
  location_id?: string;
  number_of_positions?: number;
  employment_type: string;
  min_experience_years?: number;
  max_experience_years?: number;
  required_qualifications?: string;
  preferred_qualifications?: string;
  status?: string;
  priority?: string;
  requested_by?: string;
  approved_by?: string;
  approved_at?: Date;
}

// =====================================================
// ASSET
// =====================================================

export interface Asset {
  asset_id: string;
  organization_id: string;
  asset_name: string;
  asset_code: string;
  asset_tag?: string;
  category_id: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: Date;
  purchase_price?: number;
  currency?: string;
  vendor?: string;
  warranty_expiry_date?: Date;
  status?: AssetStatus;
  condition?: string;
  location_id?: string;
}

// =====================================================
// GOAL (Performance)
// =====================================================

export interface Goal {
  goal_id: string;
  organization_id: string;
  employee_id: string;
  cycle_id?: string;
  goal_title: string;
  goal_description?: string;
  goal_type?: string;
  start_date: Date;
  due_date: Date;
  progress_percentage?: number;
  status?: string;
  weight_percentage?: number;
}

// =====================================================
// CANDIDATE (Recruitment)
// =====================================================

export interface Candidate {
  candidate_id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  current_company?: string;
  current_position?: string;
  total_experience_years?: number;
  resume_url?: string;
  source?: string;
  status?: ApplicationStatus;
}

// =====================================================
// ONBOARDING PROGRAM
// =====================================================

export interface OnboardingProgram {
  program_id: string;
  organization_id: string;
  program_name: string;
  description?: string;
  duration_days: number;
  target_department_id?: string;
  target_designation_id?: string;
  is_active?: boolean;
}
