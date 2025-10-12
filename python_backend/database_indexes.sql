-- ============================================
-- CRITICAL DATABASE INDEXES FOR PERFORMANCE
-- ============================================
-- This file contains all critical indexes needed for optimal HRMS performance
-- Run this after initial database setup to improve query performance

-- ============================================
-- USER MANAGEMENT INDEXES
-- ============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_org_active ON users(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- ============================================
-- EMPLOYEE MANAGEMENT INDEXES
-- ============================================

-- Employees table indexes
CREATE INDEX IF NOT EXISTS idx_employees_employee_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_employment_type ON employees(employment_type);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);
CREATE INDEX IF NOT EXISTS idx_employees_termination_date ON employees(termination_date);
CREATE INDEX IF NOT EXISTS idx_employees_is_deleted ON employees(is_deleted);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(created_at);

-- Composite indexes for common employee queries
CREATE INDEX IF NOT EXISTS idx_employees_org_status ON employees(organization_id, employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_dept_status ON employees(department_id, employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_manager_status ON employees(manager_id, employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date_status ON employees(hire_date, employment_status);

-- ============================================
-- ATTENDANCE MANAGEMENT INDEXES
-- ============================================

-- Attendance table indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance(created_at);

-- Composite indexes for attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date_status ON attendance(date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date_status ON attendance(employee_id, date, status);

-- Time tracking indexes
CREATE INDEX IF NOT EXISTS idx_time_tracking_employee_id ON time_tracking(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_date ON time_tracking(date);
CREATE INDEX IF NOT EXISTS idx_time_tracking_project_id ON time_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_created_at ON time_tracking(created_at);

-- ============================================
-- LEAVE MANAGEMENT INDEXES
-- ============================================

-- Leave requests indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type ON leave_requests(leave_type);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON leave_requests(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_end_date ON leave_requests(end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON leave_requests(created_at);

-- Composite indexes for leave queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status ON leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_date_range ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_date ON leave_requests(employee_id, start_date);

-- Leave balances indexes
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_leave_type ON leave_balances(leave_type);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);

-- ============================================
-- PERFORMANCE MANAGEMENT INDEXES
-- ============================================

-- Performance reviews indexes
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_review_period_start ON performance_reviews(review_period_start);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_review_period_end ON performance_reviews(review_period_end);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_created_at ON performance_reviews(created_at);

-- Composite indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_period ON performance_reviews(employee_id, review_period_start);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_period ON performance_reviews(reviewer_id, review_period_start);

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_employee_id ON goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_due_date ON goals(due_date);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at);

-- ============================================
-- PAYROLL MANAGEMENT INDEXES
-- ============================================

-- Payroll records indexes
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_pay_period_start ON payroll_records(pay_period_start);
CREATE INDEX IF NOT EXISTS idx_payroll_pay_period_end ON payroll_records(pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_records(status);
CREATE INDEX IF NOT EXISTS idx_payroll_created_at ON payroll_records(created_at);

-- Composite indexes for payroll queries
CREATE INDEX IF NOT EXISTS idx_payroll_employee_period ON payroll_records(employee_id, pay_period_start);
CREATE INDEX IF NOT EXISTS idx_payroll_period_status ON payroll_records(pay_period_start, status);

-- Salary components indexes
CREATE INDEX IF NOT EXISTS idx_salary_components_employee_id ON salary_components(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_components_component_type ON salary_components(component_type);
CREATE INDEX IF NOT EXISTS idx_salary_components_effective_date ON salary_components(effective_date);

-- ============================================
-- RECRUITMENT MANAGEMENT INDEXES
-- ============================================

-- Job postings indexes
CREATE INDEX IF NOT EXISTS idx_job_postings_organization_id ON job_postings(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_employment_type ON job_postings(employment_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at);
CREATE INDEX IF NOT EXISTS idx_job_postings_application_deadline ON job_postings(application_deadline);

-- Composite indexes for recruitment queries
CREATE INDEX IF NOT EXISTS idx_job_postings_org_status ON job_postings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_job_postings_status_deadline ON job_postings(status, application_deadline);

-- Candidates indexes
CREATE INDEX IF NOT EXISTS idx_candidates_job_posting_id ON candidates(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- Interviews indexes
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_date ON interviews(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

-- ============================================
-- EXPENSE MANAGEMENT INDEXES
-- ============================================

-- Expense claims indexes
CREATE INDEX IF NOT EXISTS idx_expense_claims_employee_id ON expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_category ON expense_claims(category);
CREATE INDEX IF NOT EXISTS idx_expense_claims_expense_date ON expense_claims(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_claims_created_at ON expense_claims(created_at);

-- Composite indexes for expense queries
CREATE INDEX IF NOT EXISTS idx_expense_claims_employee_status ON expense_claims(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_date_status ON expense_claims(expense_date, status);

-- ============================================
-- HELPDESK MANAGEMENT INDEXES
-- ============================================

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON tickets(updated_at);

-- Composite indexes for helpdesk queries
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_status ON tickets(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority_status ON tickets(priority, status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_status ON tickets(created_at, status);

-- ============================================
-- DOCUMENT MANAGEMENT INDEXES
-- ============================================

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON documents(is_public);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON documents(expiry_date);

-- Document access indexes
CREATE INDEX IF NOT EXISTS idx_document_access_document_id ON document_access(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_employee_id ON document_access(employee_id);
CREATE INDEX IF NOT EXISTS idx_document_access_access_type ON document_access(access_type);

-- ============================================
-- WORKFLOW MANAGEMENT INDEXES
-- ============================================

-- Workflows indexes
CREATE INDEX IF NOT EXISTS idx_workflows_organization_id ON workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);

-- Workflow instances indexes
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id ON workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_employee_id ON workflow_instances(employee_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_created_at ON workflow_instances(created_at);

-- ============================================
-- COMPLIANCE MANAGEMENT INDEXES
-- ============================================

-- Compliance policies indexes
CREATE INDEX IF NOT EXISTS idx_compliance_policies_organization_id ON compliance_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_policy_type ON compliance_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_effective_date ON compliance_policies(effective_date);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_is_mandatory ON compliance_policies(is_mandatory);

-- Compliance acknowledgments indexes
CREATE INDEX IF NOT EXISTS idx_compliance_acknowledgments_policy_id ON compliance_acknowledgments(policy_id);
CREATE INDEX IF NOT EXISTS idx_compliance_acknowledgments_employee_id ON compliance_acknowledgments(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_acknowledgments_acknowledged_at ON compliance_acknowledgments(acknowledged_at);

-- ============================================
-- INTEGRATION MANAGEMENT INDEXES
-- ============================================

-- Integrations indexes
CREATE INDEX IF NOT EXISTS idx_integrations_organization_id ON integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_is_active ON integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_integrations_created_at ON integrations(created_at);

-- Integration logs indexes
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_id ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at);

-- ============================================
-- ANALYTICS AND REPORTING INDEXES
-- ============================================

-- Analytics queries indexes
CREATE INDEX IF NOT EXISTS idx_analytics_queries_organization_id ON analytics_queries(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_queries_metric_type ON analytics_queries(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_queries_created_at ON analytics_queries(created_at);

-- Report templates indexes
CREATE INDEX IF NOT EXISTS idx_report_templates_organization_id ON report_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_public ON report_templates(is_public);

-- ============================================
-- NOTIFICATION MANAGEMENT INDEXES
-- ============================================

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Composite indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_priority_created ON notifications(priority, created_at);

-- ============================================
-- AUDIT AND LOGGING INDEXES
-- ============================================

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Composite indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_action ON audit_logs(entity_type, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_action ON audit_logs(created_at, action);

-- ============================================
-- SYSTEM HEALTH INDEXES
-- ============================================

-- System health checks indexes
CREATE INDEX IF NOT EXISTS idx_system_health_check_type ON system_health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_system_health_created_at ON system_health_checks(created_at);

-- ============================================
-- BACKUP AND MAINTENANCE INDEXES
-- ============================================

-- Backup records indexes
CREATE INDEX IF NOT EXISTS idx_backup_records_backup_type ON backup_records(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_backup_records_created_at ON backup_records(created_at);

-- ============================================
-- PERFORMANCE MONITORING INDEXES
-- ============================================

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);

-- API performance indexes
CREATE INDEX IF NOT EXISTS idx_api_performance_endpoint ON api_performance(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_performance_response_time ON api_performance(response_time);
CREATE INDEX IF NOT EXISTS idx_api_performance_created_at ON api_performance(created_at);

-- ============================================
-- ADDITIONAL COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================

-- Employee dashboard queries
CREATE INDEX IF NOT EXISTS idx_employees_org_dept_status ON employees(organization_id, department_id, employment_status);

-- Attendance reporting queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date_range ON attendance(employee_id, date, status);

-- Leave balance queries
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year_type ON leave_balances(employee_id, year, leave_type);

-- Performance review queries
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_period_status ON performance_reviews(employee_id, review_period_start, status);

-- Payroll processing queries
CREATE INDEX IF NOT EXISTS idx_payroll_employee_period_status ON payroll_records(employee_id, pay_period_start, status);

-- Recruitment pipeline queries
CREATE INDEX IF NOT EXISTS idx_candidates_job_status ON candidates(job_posting_id, status);

-- Expense approval queries
CREATE INDEX IF NOT EXISTS idx_expense_claims_employee_date_status ON expense_claims(employee_id, expense_date, status);

-- Helpdesk ticket queries
CREATE INDEX IF NOT EXISTS idx_tickets_priority_status_created ON tickets(priority, status, created_at);

-- Document access queries
CREATE INDEX IF NOT EXISTS idx_document_access_employee_type ON document_access(employee_id, access_type);

-- Workflow execution queries
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_status ON workflow_instances(workflow_id, status);

-- Compliance tracking queries
CREATE INDEX IF NOT EXISTS idx_compliance_acknowledgments_policy_employee ON compliance_acknowledgments(policy_id, employee_id);

-- Integration sync queries
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_status_created ON integration_logs(integration_id, status, created_at);

-- Analytics dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_queries_org_type_created ON analytics_queries(organization_id, metric_type, created_at);

-- Notification delivery queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_type_read ON notifications(recipient_id, type, is_read);

-- Audit trail queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_entity_action ON audit_logs(user_id, entity_type, action);

-- ============================================
-- PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- ============================================

-- Active employees only
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(employee_id) WHERE employment_status = 'ACTIVE';

-- Active workflows only
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(workflow_id) WHERE is_active = true;

-- Unread notifications only
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, created_at) WHERE is_read = false;

-- Recent audit logs only (last 30 days)
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent ON audit_logs(user_id, created_at) WHERE created_at > NOW() - INTERVAL '30 days';

-- ============================================
-- INDEX MAINTENANCE QUERIES
-- ============================================

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE employees;
ANALYZE attendance;
ANALYZE leave_requests;
ANALYZE performance_reviews;
ANALYZE payroll_records;
ANALYZE job_postings;
ANALYZE candidates;
ANALYZE expense_claims;
ANALYZE tickets;
ANALYZE documents;
ANALYZE workflows;
ANALYZE compliance_policies;
ANALYZE integrations;
ANALYZE notifications;
ANALYZE audit_logs;

-- ============================================
-- INDEX USAGE MONITORING
-- ============================================

-- Query to check index usage (run periodically)
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_scan DESC;

-- Query to identify unused indexes
-- SELECT schemaname, tablename, indexname, idx_scan 
-- FROM pg_stat_user_indexes 
-- WHERE idx_scan = 0 
-- ORDER BY schemaname, tablename, indexname;

-- ============================================
-- PERFORMANCE OPTIMIZATION NOTES
-- ============================================

-- 1. These indexes are designed for the most common query patterns in HRMS
-- 2. Composite indexes are ordered by selectivity (most selective first)
-- 3. Partial indexes are used for frequently filtered conditions
-- 4. Regular ANALYZE commands help maintain optimal query plans
-- 5. Monitor index usage and remove unused indexes to save space
-- 6. Consider partitioning large tables (attendance, audit_logs) by date
-- 7. Use covering indexes for frequently accessed columns only
-- 8. Balance between query performance and index maintenance overhead
