// =====================================================
// Employee Service
// Business logic for employee management
// =====================================================

import { Employee, EmployeeData } from '../domain/Employee';
import { IEmployeeRepository } from '../repositories/interfaces';
import { EventPublisher } from '../events/EventPublisher';
import { AuditService } from './AuditService';

export class EmployeeService {
  constructor(
    private employeeRepository: IEmployeeRepository,
    private eventPublisher: EventPublisher,
    private auditService: AuditService
  ) {}

  async createEmployee(data: EmployeeData, createdBy: string): Promise<Employee> {
    // Validate unique email
    const existingEmployee = await this.employeeRepository.findByEmail(
      data.email,
      data.organization_id
    );
    
    if (existingEmployee) {
      throw new Error('Employee with this email already exists');
    }

    // Create employee entity
    const employee = new Employee(data);
    
    // Persist to database
    const savedEmployee = await this.employeeRepository.create(employee);
    
    // Publish domain event
    await this.eventPublisher.publish({
      eventType: 'employee',
      eventName: 'employee.created',
      organizationId: data.organization_id,
      aggregateType: 'employee',
      aggregateId: savedEmployee.id,
      payload: {
        employeeId: savedEmployee.id,
        employeeCode: savedEmployee.id, // Simplified
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        departmentId: data.department_id,
        hireDate: data.hire_date,
      },
      metadata: { createdBy },
    });
    
    // Audit log
    await this.auditService.auditChange(
      createdBy,
      'employee',
      savedEmployee.id,
      'create',
      undefined,
      savedEmployee.toJSON()
    );
    
    return savedEmployee;
  }

  async getEmployee(employeeId: string, organizationId: string): Promise<Employee | null> {
    return await this.employeeRepository.findById(employeeId, organizationId);
  }

  async listEmployees(
    organizationId: string,
    filters?: {
      departmentId?: string;
      status?: string;
      searchTerm?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ employees: Employee[]; total: number }> {
    return await this.employeeRepository.findAll(organizationId, filters);
  }
}
