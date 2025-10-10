// Domain Model: Employee Entity
// This represents the core employee entity with business rules

export interface EmployeeData {
  employee_id?: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  hire_date: Date;
  department_id?: string;
  position?: string;
  employment_status: EmploymentStatus;
}

export enum EmploymentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
  ON_LEAVE = 'on_leave',
}

export class Employee {
  private data: Required<EmployeeData>;

  constructor(data: EmployeeData) {
    this.validate(data);
    this.data = {
      employee_id: data.employee_id || this.generateId(),
      organization_id: data.organization_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone_number: data.phone_number || '',
      hire_date: data.hire_date,
      department_id: data.department_id || '',
      position: data.position || '',
      employment_status: data.employment_status,
    };
  }

  private validate(data: EmployeeData): void {
    // Validation: First name is required
    if (!data.first_name || data.first_name.trim().length === 0) {
      throw new Error('First name is required');
    }

    // Validation: Last name is required
    if (!data.last_name || data.last_name.trim().length === 0) {
      throw new Error('Last name is required');
    }

    // Validation: Email is required and must be valid
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Valid email is required');
    }

    // Validation: Organization ID is required
    if (!data.organization_id) {
      throw new Error('Organization ID is required');
    }

    // Validation: Hire date must not be in the future
    if (data.hire_date > new Date()) {
      throw new Error('Hire date cannot be in the future');
    }

    // Validation: Employment status is required
    if (!data.employment_status) {
      throw new Error('Employment status is required');
    }

    // Validation: Employment status must be valid
    if (!Object.values(EmploymentStatus).includes(data.employment_status)) {
      throw new Error('Invalid employment status');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateId(): string {
    // Simple ID generation for demo - in production use UUID
    return `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id(): string {
    return this.data.employee_id;
  }

  get organizationId(): string {
    return this.data.organization_id;
  }

  get fullName(): string {
    return `${this.data.first_name} ${this.data.last_name}`;
  }

  get email(): string {
    return this.data.email;
  }

  get phoneNumber(): string | undefined {
    return this.data.phone_number || undefined;
  }

  get hireDate(): Date {
    return this.data.hire_date;
  }

  get employmentStatus(): EmploymentStatus {
    return this.data.employment_status;
  }

  get isActive(): boolean {
    return this.data.employment_status === EmploymentStatus.ACTIVE;
  }

  // Business methods
  terminate(): void {
    if (this.data.employment_status === EmploymentStatus.TERMINATED) {
      throw new Error('Employee is already terminated');
    }
    this.data.employment_status = EmploymentStatus.TERMINATED;
  }

  activate(): void {
    if (this.data.employment_status === EmploymentStatus.ACTIVE) {
      throw new Error('Employee is already active');
    }
    this.data.employment_status = EmploymentStatus.ACTIVE;
  }

  updateContactInfo(email: string, phoneNumber?: string): void {
    if (!this.isValidEmail(email)) {
      throw new Error('Valid email is required');
    }
    this.data.email = email;
    if (phoneNumber) {
      this.data.phone_number = phoneNumber;
    }
  }

  toJSON(): Required<EmployeeData> {
    return { ...this.data };
  }
}
