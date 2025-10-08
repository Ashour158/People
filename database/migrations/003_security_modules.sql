-- Security Enhancement Modules Migration
-- Adds tables and columns for MFA, IP whitelisting, audit logging, and threat detection

-- Add MFA fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];

-- Add IP whitelist fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS enable_ip_whitelist BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allowed_ips TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allow_localhost BOOLEAN DEFAULT TRUE;

-- Add password policy fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS password_min_length INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS password_require_uppercase BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS password_require_lowercase BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS password_require_numbers BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS password_require_special_chars BOOLEAN DEFAULT TRUE;

-- Create audit_logs table for advanced audit logging
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(organization_id),
  user_id UUID REFERENCES users(user_id),
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  target_user_id UUID REFERENCES users(user_id),
  target_resource VARCHAR(100),
  target_resource_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_resource ON audit_logs(target_resource, target_resource_id);

-- Create blocked_ips table for threat detection
CREATE TABLE IF NOT EXISTS blocked_ips (
  blocked_ip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES users(user_id),
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by UUID REFERENCES users(user_id)
);

-- Create indexes for blocked_ips
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires ON blocked_ips(expires_at);

-- Create security_alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(organization_id),
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for security_alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_org ON security_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);

-- Create security_settings table for organization-level security configuration
CREATE TABLE IF NOT EXISTS security_settings (
  setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(organization_id) UNIQUE,
  enforce_mfa BOOLEAN DEFAULT FALSE,
  session_timeout_minutes INTEGER DEFAULT 1440, -- 24 hours
  max_session_duration_hours INTEGER DEFAULT 168, -- 7 days
  password_expiry_days INTEGER DEFAULT 90,
  failed_login_attempts_threshold INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  enable_threat_detection BOOLEAN DEFAULT TRUE,
  threat_score_threshold INTEGER DEFAULT 75,
  enable_audit_logging BOOLEAN DEFAULT TRUE,
  audit_retention_days INTEGER DEFAULT 365,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_by UUID REFERENCES users(user_id)
);

-- Create indexes for security_settings
CREATE INDEX IF NOT EXISTS idx_security_settings_org ON security_settings(organization_id);

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all security and data events';
COMMENT ON TABLE blocked_ips IS 'IP addresses blocked due to suspicious activity';
COMMENT ON TABLE security_alerts IS 'Security alerts and incidents';
COMMENT ON TABLE security_settings IS 'Organization-level security configuration';

COMMENT ON COLUMN users.mfa_enabled IS 'Whether MFA is enabled for the user';
COMMENT ON COLUMN users.mfa_verified IS 'Whether MFA has been successfully verified';
COMMENT ON COLUMN users.mfa_secret IS 'Encrypted MFA secret key';
COMMENT ON COLUMN users.mfa_backup_codes IS 'Array of backup codes for MFA';

COMMENT ON COLUMN organizations.enable_ip_whitelist IS 'Whether IP whitelisting is enabled';
COMMENT ON COLUMN organizations.allowed_ips IS 'Array of allowed IP addresses or CIDR ranges';
COMMENT ON COLUMN organizations.allow_localhost IS 'Whether to allow localhost connections';

-- Create a function to auto-delete old audit logs (for retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs()');
