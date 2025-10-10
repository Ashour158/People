import { describe, it, expect } from 'vitest';
import {
  ROLES,
  EMPLOYEE_PERMISSIONS,
  LEAVE_PERMISSIONS,
  PERFORMANCE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  ROLE_PERMISSIONS,
} from '../../constants/permissions';

describe('Permission Constants', () => {
  describe('ROLES', () => {
    it('should have all required roles defined', () => {
      expect(ROLES.SUPER_ADMIN).toBe('super_admin');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.HR_MANAGER).toBe('hr_manager');
      expect(ROLES.MANAGER).toBe('manager');
      expect(ROLES.EMPLOYEE).toBe('employee');
      expect(ROLES.FINANCE).toBe('finance');
      expect(ROLES.RECRUITER).toBe('recruiter');
    });
  });

  describe('Permission Objects', () => {
    it('should have employee permissions', () => {
      expect(EMPLOYEE_PERMISSIONS.VIEW_ALL).toBe('employees:view_all');
      expect(EMPLOYEE_PERMISSIONS.CREATE).toBe('employees:create');
      expect(EMPLOYEE_PERMISSIONS.UPDATE).toBe('employees:update');
    });

    it('should have leave permissions', () => {
      expect(LEAVE_PERMISSIONS.VIEW_ALL).toBe('leave:view_all');
      expect(LEAVE_PERMISSIONS.APPLY).toBe('leave:apply');
      expect(LEAVE_PERMISSIONS.APPROVE).toBe('leave:approve');
    });

    it('should have performance permissions', () => {
      expect(PERFORMANCE_PERMISSIONS.VIEW_ALL).toBe('performance:view_all');
      expect(PERFORMANCE_PERMISSIONS.CREATE_GOAL).toBe('performance:create_goal');
    });
  });
});

describe('Permission Helper Functions', () => {
  describe('hasPermission', () => {
    it('should return true when user has the permission', () => {
      const userPermissions = ['employees:view_all', 'employees:create'];
      const result = hasPermission(userPermissions, 'employees:view_all');
      expect(result).toBe(true);
    });

    it('should return false when user does not have the permission', () => {
      const userPermissions = ['employees:view_own'];
      const result = hasPermission(userPermissions, 'employees:view_all');
      expect(result).toBe(false);
    });

    it('should return false when permissions are undefined', () => {
      const result = hasPermission(undefined, 'employees:view_all');
      expect(result).toBe(false);
    });

    it('should return false when permissions are empty', () => {
      const result = hasPermission([], 'employees:view_all');
      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', () => {
      const userPermissions = ['employees:view_own', 'leave:apply'];
      const requiredPermissions = ['employees:view_all', 'employees:view_own'];
      const result = hasAnyPermission(userPermissions, requiredPermissions);
      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      const userPermissions = ['employees:view_own'];
      const requiredPermissions = ['employees:create', 'employees:delete'];
      const result = hasAnyPermission(userPermissions, requiredPermissions);
      expect(result).toBe(false);
    });

    it('should return false when permissions are undefined', () => {
      const requiredPermissions = ['employees:view_all'];
      const result = hasAnyPermission(undefined, requiredPermissions);
      expect(result).toBe(false);
    });

    it('should return false when required permissions are empty', () => {
      const userPermissions = ['employees:view_all'];
      const result = hasAnyPermission(userPermissions, []);
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', () => {
      const userPermissions = ['employees:view_all', 'employees:create', 'employees:update'];
      const requiredPermissions = ['employees:view_all', 'employees:create'];
      const result = hasAllPermissions(userPermissions, requiredPermissions);
      expect(result).toBe(true);
    });

    it('should return false when user is missing some permissions', () => {
      const userPermissions = ['employees:view_all'];
      const requiredPermissions = ['employees:view_all', 'employees:create'];
      const result = hasAllPermissions(userPermissions, requiredPermissions);
      expect(result).toBe(false);
    });

    it('should return false when permissions are undefined', () => {
      const requiredPermissions = ['employees:view_all'];
      const result = hasAllPermissions(undefined, requiredPermissions);
      expect(result).toBe(false);
    });

    it('should return false when required permissions are empty', () => {
      const userPermissions = ['employees:view_all'];
      const result = hasAllPermissions(userPermissions, []);
      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', () => {
      const result = hasRole('admin', 'admin');
      expect(result).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      const result = hasRole('employee', 'admin');
      expect(result).toBe(false);
    });

    it('should return false when role is undefined', () => {
      const result = hasRole(undefined, 'admin');
      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the roles', () => {
      const requiredRoles = ['admin', 'hr_manager'];
      const result = hasAnyRole('hr_manager', requiredRoles);
      expect(result).toBe(true);
    });

    it('should return false when user has none of the roles', () => {
      const requiredRoles = ['admin', 'hr_manager'];
      const result = hasAnyRole('employee', requiredRoles);
      expect(result).toBe(false);
    });

    it('should return false when role is undefined', () => {
      const requiredRoles = ['admin', 'hr_manager'];
      const result = hasAnyRole(undefined, requiredRoles);
      expect(result).toBe(false);
    });

    it('should return false when required roles are empty', () => {
      const result = hasAnyRole('admin', []);
      expect(result).toBe(false);
    });
  });
});

describe('ROLE_PERMISSIONS', () => {
  it('should have permissions defined for all roles', () => {
    expect(ROLE_PERMISSIONS[ROLES.SUPER_ADMIN]).toBeDefined();
    expect(ROLE_PERMISSIONS[ROLES.ADMIN]).toBeDefined();
    expect(ROLE_PERMISSIONS[ROLES.HR_MANAGER]).toBeDefined();
    expect(ROLE_PERMISSIONS[ROLES.MANAGER]).toBeDefined();
    expect(ROLE_PERMISSIONS[ROLES.EMPLOYEE]).toBeDefined();
    expect(ROLE_PERMISSIONS[ROLES.FINANCE]).toBeDefined();
    expect(ROLE_PERMISSIONS[ROLES.RECRUITER]).toBeDefined();
  });

  it('should give super_admin all permissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.SUPER_ADMIN];
    expect(permissions).toContain('*');
  });

  it('should give admin comprehensive permissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.ADMIN];
    expect(permissions).toContain(EMPLOYEE_PERMISSIONS.VIEW_ALL);
    expect(permissions).toContain(EMPLOYEE_PERMISSIONS.CREATE);
    expect(permissions).toContain(LEAVE_PERMISSIONS.APPROVE);
  });

  it('should give manager limited permissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.MANAGER];
    expect(permissions).toContain(EMPLOYEE_PERMISSIONS.VIEW_ALL);
    expect(permissions).toContain(LEAVE_PERMISSIONS.APPROVE);
    expect(permissions).not.toContain(EMPLOYEE_PERMISSIONS.DELETE);
  });

  it('should give employee self-service permissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.EMPLOYEE];
    expect(permissions).toContain(EMPLOYEE_PERMISSIONS.VIEW_OWN);
    expect(permissions).toContain(LEAVE_PERMISSIONS.APPLY);
    expect(permissions).not.toContain(EMPLOYEE_PERMISSIONS.VIEW_ALL);
  });

  it('should give HR manager recruitment permissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.HR_MANAGER];
    expect(permissions).toContain('recruitment:view_jobs');
    expect(permissions).toContain('recruitment:create_job');
    expect(permissions).toContain('recruitment:view_candidates');
  });

  it('should give finance payroll permissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.FINANCE];
    expect(permissions).toContain('payroll:view_all');
    expect(permissions).toContain('payroll:process');
    expect(permissions).toContain('expenses:reimburse');
  });

  it('should give recruiter only recruitment permissions', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.RECRUITER];
    expect(permissions).toContain('recruitment:view_jobs');
    expect(permissions).toContain('recruitment:create_candidate');
    // Should not have other module permissions
    expect(permissions).not.toContain(EMPLOYEE_PERMISSIONS.CREATE);
    expect(permissions).not.toContain('payroll:process');
  });

  it('should ensure employees cannot approve their own leave', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.EMPLOYEE];
    expect(permissions).toContain(LEAVE_PERMISSIONS.APPLY);
    expect(permissions).not.toContain(LEAVE_PERMISSIONS.APPROVE);
  });

  it('should ensure employees can only view their own data', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.EMPLOYEE];
    expect(permissions).toContain(EMPLOYEE_PERMISSIONS.VIEW_OWN);
    expect(permissions).toContain('attendance:view_own');
    expect(permissions).toContain('leave:view_own');
    expect(permissions).not.toContain(EMPLOYEE_PERMISSIONS.VIEW_ALL);
    expect(permissions).not.toContain('attendance:view_all');
  });
});
