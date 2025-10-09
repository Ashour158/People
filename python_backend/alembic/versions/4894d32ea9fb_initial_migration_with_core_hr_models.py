"""Initial migration with core HR models

Revision ID: 4894d32ea9fb
Revises: 
Create Date: 2025-10-09 01:47:48.067332

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4894d32ea9fb'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create enums
    op.execute("CREATE TYPE roleenum AS ENUM ('super_admin', 'admin', 'hr_manager', 'manager', 'employee')")
    op.execute("CREATE TYPE employmentstatus AS ENUM ('active', 'inactive', 'terminated', 'resigned')")
    op.execute("CREATE TYPE employmenttype AS ENUM ('full_time', 'part_time', 'contract', 'intern')")
    op.execute("CREATE TYPE leavestatus AS ENUM ('pending', 'approved', 'rejected', 'cancelled')")
    
    # Organizations table
    op.create_table('organizations',
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_name', sa.String(length=255), nullable=False),
        sa.Column('organization_code', sa.String(length=50), nullable=False),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('contact_phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('modified_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('organization_id'),
        sa.UniqueConstraint('organization_code')
    )
    op.create_index(op.f('ix_organizations_organization_id'), 'organizations', ['organization_id'], unique=False)
    
    # Companies table
    op.create_table('companies',
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('company_code', sa.String(length=50), nullable=False),
        sa.Column('legal_name', sa.String(length=255), nullable=True),
        sa.Column('registration_number', sa.String(length=100), nullable=True),
        sa.Column('tax_id', sa.String(length=100), nullable=True),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('contact_phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('modified_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.organization_id'], ),
        sa.PrimaryKeyConstraint('company_id')
    )
    op.create_index(op.f('ix_companies_company_id'), 'companies', ['company_id'], unique=False)
    
    # Users table
    op.create_table('users',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', postgresql.ENUM('super_admin', 'admin', 'hr_manager', 'manager', 'employee', name='roleenum', create_type=False), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_login_attempts', sa.Integer(), nullable=True),
        sa.Column('account_locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('password_reset_token', sa.String(length=255), nullable=True),
        sa.Column('password_reset_expires', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('modified_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.organization_id'], ),
        sa.PrimaryKeyConstraint('user_id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=False)
    
    # Departments table
    op.create_table('departments',
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('department_name', sa.String(length=255), nullable=False),
        sa.Column('department_code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parent_department_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('modified_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.company_id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.organization_id'], ),
        sa.ForeignKeyConstraint(['parent_department_id'], ['departments.department_id'], ),
        sa.PrimaryKeyConstraint('department_id')
    )
    op.create_index(op.f('ix_departments_department_id'), 'departments', ['department_id'], unique=False)
    
    # Leave Types table
    op.create_table('leave_types',
        sa.Column('leave_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('leave_type_name', sa.String(length=100), nullable=False),
        sa.Column('leave_type_code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('days_per_year', sa.Float(), nullable=False),
        sa.Column('is_paid', sa.Boolean(), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=True),
        sa.Column('can_be_carried_forward', sa.Boolean(), nullable=True),
        sa.Column('max_carry_forward_days', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('modified_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.organization_id'], ),
        sa.PrimaryKeyConstraint('leave_type_id')
    )
    
    # Employees table
    op.create_table('employees',
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('employee_code', sa.String(length=50), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('middle_name', sa.String(length=100), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(length=20), nullable=True),
        sa.Column('marital_status', sa.String(length=20), nullable=True),
        sa.Column('nationality', sa.String(length=50), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('personal_email', sa.String(length=255), nullable=True),
        sa.Column('emergency_contact_name', sa.String(length=255), nullable=True),
        sa.Column('emergency_contact_phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('postal_code', sa.String(length=20), nullable=True),
        sa.Column('profile_picture_url', sa.String(length=500), nullable=True),
        sa.Column('hire_date', sa.Date(), nullable=True),
        sa.Column('employment_type', postgresql.ENUM('full_time', 'part_time', 'contract', 'intern', name='employmenttype', create_type=False), nullable=True),
        sa.Column('employment_status', postgresql.ENUM('active', 'inactive', 'terminated', 'resigned', name='employmentstatus', create_type=False), nullable=True),
        sa.Column('termination_date', sa.Date(), nullable=True),
        sa.Column('termination_reason', sa.Text(), nullable=True),
        sa.Column('job_title', sa.String(length=255), nullable=True),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('manager_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('work_location', sa.String(length=255), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('modified_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('modified_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.company_id'], ),
        sa.ForeignKeyConstraint(['department_id'], ['departments.department_id'], ),
        sa.ForeignKeyConstraint(['manager_id'], ['employees.employee_id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.organization_id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
        sa.PrimaryKeyConstraint('employee_id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_employees_employee_code'), 'employees', ['employee_code'], unique=False)
    op.create_index(op.f('ix_employees_employee_id'), 'employees', ['employee_id'], unique=False)
    
    # Attendance table
    op.create_table('attendance',
        sa.Column('attendance_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('attendance_date', sa.Date(), nullable=False),
        sa.Column('check_in_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('check_out_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('work_hours', sa.Float(), nullable=True),
        sa.Column('overtime_hours', sa.Float(), nullable=True),
        sa.Column('late_minutes', sa.Integer(), nullable=True),
        sa.Column('early_leave_minutes', sa.Integer(), nullable=True),
        sa.Column('work_type', sa.String(length=50), nullable=True),
        sa.Column('check_in_latitude', sa.Float(), nullable=True),
        sa.Column('check_in_longitude', sa.Float(), nullable=True),
        sa.Column('check_in_location', sa.String(length=255), nullable=True),
        sa.Column('check_out_latitude', sa.Float(), nullable=True),
        sa.Column('check_out_longitude', sa.Float(), nullable=True),
        sa.Column('check_out_location', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('device', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('is_regularized', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('modified_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.employee_id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.organization_id'], ),
        sa.PrimaryKeyConstraint('attendance_id')
    )
    op.create_index(op.f('ix_attendance_attendance_date'), 'attendance', ['attendance_date'], unique=False)
    
    # Leave Requests table
    op.create_table('leave_requests',
        sa.Column('leave_request_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('leave_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('total_days', sa.Float(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'approved', 'rejected', 'cancelled', name='leavestatus', create_type=False), nullable=True),
        sa.Column('approver_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('approved_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approver_comments', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('modified_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['approver_id'], ['employees.employee_id'], ),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.employee_id'], ),
        sa.ForeignKeyConstraint(['leave_type_id'], ['leave_types.leave_type_id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.organization_id'], ),
        sa.PrimaryKeyConstraint('leave_request_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('leave_requests')
    op.drop_table('attendance')
    op.drop_table('employees')
    op.drop_table('leave_types')
    op.drop_table('departments')
    op.drop_table('users')
    op.drop_table('companies')
    op.drop_table('organizations')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS leavestatus")
    op.execute("DROP TYPE IF EXISTS employmenttype")
    op.execute("DROP TYPE IF EXISTS employmentstatus")
    op.execute("DROP TYPE IF EXISTS roleenum")
