-- =====================================================
-- Migration 0011: Unified Notification Templates with i18n
-- Email, SMS, Push, and In-App notification templates with internationalization
-- =====================================================

-- =====================================================
-- NOTIFICATION CHANNELS
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_channels (
    channel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    channel_code VARCHAR(50) NOT NULL UNIQUE,
    channel_name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push', 'in_app', 'webhook'
    
    -- Configuration
    is_enabled BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher priority channels are tried first
    
    -- Channel-specific Configuration
    config JSONB, -- SMTP settings, SMS gateway config, Push notification config, etc.
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_channels_type ON notification_channels(channel_type) WHERE is_enabled = TRUE;

COMMENT ON TABLE notification_channels IS 'Notification delivery channels';

-- =====================================================
-- NOTIFICATION TEMPLATES WITH i18n
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE, -- NULL for system templates
    
    template_code VARCHAR(100) NOT NULL,
    template_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Template Category
    category VARCHAR(100) NOT NULL, -- 'employee', 'leave', 'attendance', 'payroll', 'performance'
    
    -- Trigger Event
    trigger_event VARCHAR(100), -- Event that triggers this notification
    
    -- Channels
    -- Array of channel types: ['email', 'sms', 'push', 'in_app']
    supported_channels TEXT[] NOT NULL,
    default_channel VARCHAR(50) DEFAULT 'email',
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- Template Variables
    -- Example: ["employee_name", "leave_type", "from_date", "to_date"]
    variables TEXT[],
    
    -- Default Language
    default_language VARCHAR(10) DEFAULT 'en',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System templates cannot be deleted
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    
    CONSTRAINT unique_template_code_per_org UNIQUE (organization_id, template_code)
);

CREATE INDEX idx_notification_templates_org ON notification_templates(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_notification_templates_category ON notification_templates(category) WHERE is_active = TRUE;
CREATE INDEX idx_notification_templates_event ON notification_templates(trigger_event) WHERE is_active = TRUE;

COMMENT ON TABLE notification_templates IS 'Notification template definitions';

-- Notification Template Content (i18n support)
CREATE TABLE IF NOT EXISTS notification_template_content (
    content_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    template_id UUID NOT NULL REFERENCES notification_templates(template_id) ON DELETE CASCADE,
    
    -- Language
    language_code VARCHAR(10) NOT NULL, -- 'en', 'es', 'fr', 'de', 'ar', etc.
    
    -- Channel-specific Content
    channel_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
    
    -- Email-specific
    email_subject VARCHAR(500),
    email_body_html TEXT,
    email_body_text TEXT,
    
    -- SMS-specific
    sms_message TEXT,
    
    -- Push Notification-specific
    push_title VARCHAR(200),
    push_body VARCHAR(500),
    push_icon VARCHAR(200),
    push_action_url TEXT,
    
    -- In-App Notification-specific
    in_app_title VARCHAR(200),
    in_app_message TEXT,
    in_app_action_label VARCHAR(100),
    in_app_action_url TEXT,
    
    -- Variable Substitution Format
    -- Supports: {{variable_name}}, {variable_name}, ${variable_name}
    substitution_format VARCHAR(50) DEFAULT '{{variable_name}}',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_template_language_channel UNIQUE (template_id, language_code, channel_type)
);

CREATE INDEX idx_notification_template_content_template ON notification_template_content(template_id);
CREATE INDEX idx_notification_template_content_language ON notification_template_content(language_code);

COMMENT ON TABLE notification_template_content IS 'Localized content for notification templates';

-- =====================================================
-- NOTIFICATION QUEUE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_queue (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Template
    template_id UUID REFERENCES notification_templates(template_id),
    template_code VARCHAR(100),
    
    -- Recipient
    recipient_user_id UUID REFERENCES users(user_id),
    recipient_employee_id UUID REFERENCES employees(employee_id),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    recipient_device_token TEXT, -- For push notifications
    
    -- Channel
    channel_type VARCHAR(50) NOT NULL,
    
    -- Language
    language_code VARCHAR(10) DEFAULT 'en',
    
    -- Content (rendered)
    subject VARCHAR(500),
    body_html TEXT,
    body_text TEXT,
    
    -- Variables (for debugging and retry)
    template_variables JSONB,
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- Scheduling
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    send_after TIMESTAMP, -- For delayed sending
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'cancelled'
    
    -- Delivery Tracking
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Retry Logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Error Handling
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- External Reference (from email service provider, SMS gateway, etc.)
    external_id VARCHAR(200),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status, scheduled_at);
CREATE INDEX idx_notification_queue_org ON notification_queue(organization_id);
CREATE INDEX idx_notification_queue_recipient_user ON notification_queue(recipient_user_id);
CREATE INDEX idx_notification_queue_template ON notification_queue(template_id);
CREATE INDEX idx_notification_queue_channel ON notification_queue(channel_type, status);
CREATE INDEX idx_notification_queue_retry ON notification_queue(status, retry_count, scheduled_at) 
    WHERE status = 'failed' AND retry_count < max_retries;

COMMENT ON TABLE notification_queue IS 'Queue for pending and processed notifications';

-- =====================================================
-- USER NOTIFICATION PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Preferred Language
    preferred_language VARCHAR(10) DEFAULT 'en',
    
    -- Preferred Channels
    preferred_channels TEXT[], -- Ordered list of preferred channels
    
    -- Category-specific Preferences
    -- Example: {"leave": ["email", "in_app"], "attendance": ["in_app"], "payroll": ["email"]}
    category_channel_preferences JSONB,
    
    -- Quiet Hours (no notifications during these times)
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME, -- e.g., '22:00:00'
    quiet_hours_end TIME,   -- e.g., '08:00:00'
    
    -- Digest Preferences
    enable_daily_digest BOOLEAN DEFAULT FALSE,
    enable_weekly_digest BOOLEAN DEFAULT FALSE,
    digest_time TIME DEFAULT '09:00:00',
    
    -- Do Not Disturb
    dnd_enabled BOOLEAN DEFAULT FALSE,
    dnd_until TIMESTAMP,
    
    -- Specific Notification Types (opt-in/opt-out)
    notification_settings JSONB, -- {"leave_approved": true, "leave_rejected": true, ...}
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_notif_prefs_user ON user_notification_preferences(user_id);

COMMENT ON TABLE user_notification_preferences IS 'User-specific notification preferences';

-- =====================================================
-- NOTIFICATION HISTORY (Archive)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    notification_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    
    -- Snapshot of notification data
    template_code VARCHAR(100),
    recipient_user_id UUID,
    recipient_email VARCHAR(255),
    channel_type VARCHAR(50),
    status VARCHAR(50),
    subject VARCHAR(500),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Metadata
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partitioned by month for efficient querying
CREATE INDEX idx_notification_history_org ON notification_history(organization_id, archived_at DESC);
CREATE INDEX idx_notification_history_user ON notification_history(recipient_user_id, archived_at DESC);

COMMENT ON TABLE notification_history IS 'Archive of sent notifications';

-- =====================================================
-- SEED DEFAULT NOTIFICATION CHANNELS
-- =====================================================

INSERT INTO notification_channels (channel_code, channel_name, channel_type, is_enabled, priority) VALUES
('email_smtp', 'Email (SMTP)', 'email', TRUE, 10),
('sms_twilio', 'SMS (Twilio)', 'sms', FALSE, 8),
('push_fcm', 'Push Notification (FCM)', 'push', FALSE, 7),
('in_app', 'In-App Notification', 'in_app', TRUE, 9),
('webhook', 'Webhook', 'webhook', FALSE, 5)
ON CONFLICT (channel_code) DO NOTHING;

-- =====================================================
-- SEED DEFAULT NOTIFICATION TEMPLATES
-- =====================================================

-- Leave Request Templates
INSERT INTO notification_templates (template_code, template_name, description, category, trigger_event, supported_channels, variables, is_system) VALUES
('leave_request_submitted', 'Leave Request Submitted', 'Sent to employee when leave request is submitted', 'leave', 'leave.requested', ARRAY['email', 'in_app'], ARRAY['employee_name', 'leave_type', 'from_date', 'to_date', 'total_days', 'status'], TRUE),
('leave_request_approved', 'Leave Request Approved', 'Sent to employee when leave is approved', 'leave', 'leave.approved', ARRAY['email', 'sms', 'in_app', 'push'], ARRAY['employee_name', 'leave_type', 'from_date', 'to_date', 'approver_name', 'approved_date'], TRUE),
('leave_request_rejected', 'Leave Request Rejected', 'Sent to employee when leave is rejected', 'leave', 'leave.rejected', ARRAY['email', 'in_app', 'push'], ARRAY['employee_name', 'leave_type', 'from_date', 'to_date', 'rejection_reason', 'rejected_by'], TRUE),
('leave_approval_pending', 'Leave Approval Pending', 'Sent to manager for leave approval', 'leave', 'leave.requested', ARRAY['email', 'in_app'], ARRAY['manager_name', 'employee_name', 'leave_type', 'from_date', 'to_date', 'total_days', 'reason'], TRUE),

-- Employee Templates
('employee_onboarding', 'Employee Onboarding', 'Welcome email for new employees', 'employee', 'employee.created', ARRAY['email'], ARRAY['employee_name', 'employee_code', 'hire_date', 'department', 'designation', 'manager_name'], TRUE),
('employee_birthday', 'Employee Birthday', 'Birthday wishes for employees', 'employee', NULL, ARRAY['email', 'in_app'], ARRAY['employee_name'], TRUE),
('employee_work_anniversary', 'Work Anniversary', 'Work anniversary celebration', 'employee', NULL, ARRAY['email', 'in_app'], ARRAY['employee_name', 'years_of_service', 'hire_date'], TRUE),

-- Attendance Templates
('attendance_late_arrival', 'Late Arrival Notification', 'Notification for late arrivals', 'attendance', 'attendance.checked_in', ARRAY['email', 'in_app'], ARRAY['employee_name', 'check_in_time', 'scheduled_time', 'late_by_minutes'], TRUE),
('attendance_regularization_approved', 'Attendance Regularization Approved', 'Attendance regularization approval notification', 'attendance', NULL, ARRAY['email', 'in_app'], ARRAY['employee_name', 'attendance_date', 'reason'], TRUE),

-- Timesheet Templates
('timesheet_submission_reminder', 'Timesheet Submission Reminder', 'Reminder to submit timesheet', 'timesheet', NULL, ARRAY['email', 'in_app'], ARRAY['employee_name', 'period_start', 'period_end', 'deadline'], TRUE),
('timesheet_approved', 'Timesheet Approved', 'Timesheet approval notification', 'timesheet', 'timesheet.approved', ARRAY['email', 'in_app'], ARRAY['employee_name', 'period_start', 'period_end', 'total_hours', 'approver_name'], TRUE),

-- Payroll Templates
('payslip_generated', 'Payslip Generated', 'Monthly payslip notification', 'payroll', 'payroll.run_processed', ARRAY['email'], ARRAY['employee_name', 'month', 'year', 'net_pay', 'payment_date'], TRUE),
('salary_credited', 'Salary Credited', 'Salary credit notification', 'payroll', NULL, ARRAY['email', 'sms'], ARRAY['employee_name', 'net_pay', 'payment_date'], TRUE),

-- Performance Templates
('performance_review_initiated', 'Performance Review Initiated', 'Performance review cycle started', 'performance', NULL, ARRAY['email', 'in_app'], ARRAY['employee_name', 'review_cycle_name', 'review_period', 'deadline'], TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED DEFAULT TEMPLATE CONTENT (English)
-- =====================================================

-- Leave Request Submitted - Email
INSERT INTO notification_template_content (template_id, language_code, channel_type, email_subject, email_body_html, email_body_text)
SELECT 
    template_id,
    'en',
    'email',
    'Leave Request Submitted - {{leave_type}}',
    '<html><body><h2>Leave Request Submitted</h2><p>Hi {{employee_name}},</p><p>Your leave request for <strong>{{leave_type}}</strong> from <strong>{{from_date}}</strong> to <strong>{{to_date}}</strong> ({{total_days}} days) has been submitted successfully.</p><p>Status: <strong>{{status}}</strong></p><p>You will be notified once your request is reviewed.</p><p>Best regards,<br>HR Team</p></body></html>',
    'Hi {{employee_name}}, Your leave request for {{leave_type}} from {{from_date}} to {{to_date}} ({{total_days}} days) has been submitted successfully. Status: {{status}}. You will be notified once your request is reviewed. Best regards, HR Team'
FROM notification_templates WHERE template_code = 'leave_request_submitted'
ON CONFLICT DO NOTHING;

-- Leave Request Approved - Email
INSERT INTO notification_template_content (template_id, language_code, channel_type, email_subject, email_body_html, email_body_text)
SELECT 
    template_id,
    'en',
    'email',
    'Leave Request Approved - {{leave_type}}',
    '<html><body><h2 style="color: green;">Leave Request Approved</h2><p>Hi {{employee_name}},</p><p>Good news! Your leave request for <strong>{{leave_type}}</strong> from <strong>{{from_date}}</strong> to <strong>{{to_date}}</strong> has been <strong style="color: green;">approved</strong>.</p><p>Approved by: {{approver_name}}<br>Approved on: {{approved_date}}</p><p>Enjoy your leave!</p><p>Best regards,<br>HR Team</p></body></html>',
    'Hi {{employee_name}}, Good news! Your leave request for {{leave_type}} from {{from_date}} to {{to_date}} has been approved. Approved by: {{approver_name}} on {{approved_date}}. Enjoy your leave! Best regards, HR Team'
FROM notification_templates WHERE template_code = 'leave_request_approved'
ON CONFLICT DO NOTHING;

-- Leave Approval Pending - Email (for manager)
INSERT INTO notification_template_content (template_id, language_code, channel_type, email_subject, email_body_html, email_body_text)
SELECT 
    template_id,
    'en',
    'email',
    'Leave Approval Required - {{employee_name}}',
    '<html><body><h2>Leave Approval Required</h2><p>Hi {{manager_name}},</p><p><strong>{{employee_name}}</strong> has requested leave for <strong>{{leave_type}}</strong>.</p><p><strong>Details:</strong></p><ul><li>From: {{from_date}}</li><li>To: {{to_date}}</li><li>Total Days: {{total_days}}</li><li>Reason: {{reason}}</li></ul><p>Please review and approve/reject the request.</p><p><a href="{{approval_link}}" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Review Request</a></p><p>Best regards,<br>HR System</p></body></html>',
    'Hi {{manager_name}}, {{employee_name}} has requested leave for {{leave_type}} from {{from_date}} to {{to_date}} ({{total_days}} days). Reason: {{reason}}. Please review and approve/reject the request. Best regards, HR System'
FROM notification_templates WHERE template_code = 'leave_approval_pending'
ON CONFLICT DO NOTHING;

-- Employee Onboarding - Email
INSERT INTO notification_template_content (template_id, language_code, channel_type, email_subject, email_body_html, email_body_text)
SELECT 
    template_id,
    'en',
    'email',
    'Welcome to the Team - {{employee_name}}!',
    '<html><body><h2>Welcome to the Team!</h2><p>Hi {{employee_name}},</p><p>We are excited to welcome you to our organization!</p><p><strong>Your Details:</strong></p><ul><li>Employee Code: {{employee_code}}</li><li>Department: {{department}}</li><li>Designation: {{designation}}</li><li>Reporting Manager: {{manager_name}}</li><li>Joining Date: {{hire_date}}</li></ul><p>Please login to the HR portal to complete your onboarding process and explore your benefits.</p><p>Welcome aboard!</p><p>Best regards,<br>HR Team</p></body></html>',
    'Hi {{employee_name}}, We are excited to welcome you to our organization! Your Details: Employee Code: {{employee_code}}, Department: {{department}}, Designation: {{designation}}, Reporting Manager: {{manager_name}}, Joining Date: {{hire_date}}. Welcome aboard! Best regards, HR Team'
FROM notification_templates WHERE template_code = 'employee_onboarding'
ON CONFLICT DO NOTHING;

-- Payslip Generated - Email
INSERT INTO notification_template_content (template_id, language_code, channel_type, email_subject, email_body_html, email_body_text)
SELECT 
    template_id,
    'en',
    'email',
    'Payslip for {{month}} {{year}}',
    '<html><body><h2>Payslip Available</h2><p>Hi {{employee_name}},</p><p>Your payslip for <strong>{{month}} {{year}}</strong> is now available.</p><p><strong>Net Pay:</strong> {{net_pay}}<br><strong>Payment Date:</strong> {{payment_date}}</p><p>Please login to the HR portal to download your payslip.</p><p><a href="{{payslip_link}}" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Download Payslip</a></p><p>Best regards,<br>Payroll Team</p></body></html>',
    'Hi {{employee_name}}, Your payslip for {{month}} {{year}} is now available. Net Pay: {{net_pay}}. Payment Date: {{payment_date}}. Please login to the HR portal to download your payslip. Best regards, Payroll Team'
FROM notification_templates WHERE template_code = 'payslip_generated'
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN notification_template_content.substitution_format IS 'Variable substitution format used in templates';
COMMENT ON COLUMN notification_queue.send_after IS 'Allows scheduling notifications for future delivery';
COMMENT ON COLUMN user_notification_preferences.category_channel_preferences IS 'JSON mapping of categories to preferred channels';
