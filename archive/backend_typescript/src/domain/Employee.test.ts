import { Employee, EmploymentStatus, EmployeeData } from './Employee';

describe('Employee Domain Model', () => {
  const validEmployeeData: EmployeeData = {
    organization_id: 'org-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone_number: '+1234567890',
    hire_date: new Date('2023-01-01'),
    employment_status: EmploymentStatus.ACTIVE,
  };

  describe('Employee Creation', () => {
    it('should create a valid employee', () => {
      const employee = new Employee(validEmployeeData);

      expect(employee.fullName).toBe('John Doe');
      expect(employee.email).toBe('john.doe@example.com');
      expect(employee.isActive).toBe(true);
      expect(employee.organizationId).toBe('org-123');
    });

    it('should auto-generate employee ID if not provided', () => {
      const employee = new Employee(validEmployeeData);

      expect(employee.id).toBeDefined();
      expect(employee.id).toMatch(/^emp_/);
    });

    it('should use provided employee ID', () => {
      const dataWithId = { ...validEmployeeData, employee_id: 'custom-id' };
      const employee = new Employee(dataWithId);

      expect(employee.id).toBe('custom-id');
    });
  });

  describe('Employee Validation', () => {
    it('should throw error if first name is missing', () => {
      const invalidData = { ...validEmployeeData, first_name: '' };

      expect(() => new Employee(invalidData)).toThrow('First name is required');
    });

    it('should throw error if last name is missing', () => {
      const invalidData = { ...validEmployeeData, last_name: '' };

      expect(() => new Employee(invalidData)).toThrow('Last name is required');
    });

    it('should throw error if email is invalid', () => {
      const invalidData = { ...validEmployeeData, email: 'invalid-email' };

      expect(() => new Employee(invalidData)).toThrow('Valid email is required');
    });

    it('should throw error if organization ID is missing', () => {
      const invalidData = { ...validEmployeeData, organization_id: '' };

      expect(() => new Employee(invalidData)).toThrow('Organization ID is required');
    });

    it('should throw error if hire date is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const invalidData = { ...validEmployeeData, hire_date: futureDate };

      expect(() => new Employee(invalidData)).toThrow(
        'Hire date cannot be in the future'
      );
    });

    it('should throw error if employment status is invalid', () => {
      const invalidData = {
        ...validEmployeeData,
        employment_status: 'invalid_status' as EmploymentStatus,
      };

      expect(() => new Employee(invalidData)).toThrow('Invalid employment status');
    });
  });

  describe('Employee Business Logic', () => {
    it('should terminate an active employee', () => {
      const employee = new Employee(validEmployeeData);

      employee.terminate();

      expect(employee.employmentStatus).toBe(EmploymentStatus.TERMINATED);
      expect(employee.isActive).toBe(false);
    });

    it('should throw error when terminating already terminated employee', () => {
      const employee = new Employee({
        ...validEmployeeData,
        employment_status: EmploymentStatus.TERMINATED,
      });

      expect(() => employee.terminate()).toThrow('Employee is already terminated');
    });

    it('should activate an inactive employee', () => {
      const employee = new Employee({
        ...validEmployeeData,
        employment_status: EmploymentStatus.INACTIVE,
      });

      employee.activate();

      expect(employee.employmentStatus).toBe(EmploymentStatus.ACTIVE);
      expect(employee.isActive).toBe(true);
    });

    it('should throw error when activating already active employee', () => {
      const employee = new Employee(validEmployeeData);

      expect(() => employee.activate()).toThrow('Employee is already active');
    });

    it('should update contact information', () => {
      const employee = new Employee(validEmployeeData);
      const newEmail = 'new.email@example.com';
      const newPhone = '+9876543210';

      employee.updateContactInfo(newEmail, newPhone);

      expect(employee.email).toBe(newEmail);
      expect(employee.phoneNumber).toBe(newPhone);
    });

    it('should throw error when updating with invalid email', () => {
      const employee = new Employee(validEmployeeData);

      expect(() => employee.updateContactInfo('invalid-email')).toThrow(
        'Valid email is required'
      );
    });
  });

  describe('Employee Serialization', () => {
    it('should serialize to JSON', () => {
      const employee = new Employee(validEmployeeData);
      const json = employee.toJSON();

      expect(json).toHaveProperty('employee_id');
      expect(json).toHaveProperty('organization_id', 'org-123');
      expect(json).toHaveProperty('first_name', 'John');
      expect(json).toHaveProperty('last_name', 'Doe');
      expect(json).toHaveProperty('email', 'john.doe@example.com');
    });
  });
});
