// =====================================================
// Payroll Run Service
// Business logic for payroll processing
// =====================================================

import { PayrollRun } from '../domain/PayrollRun';
import { IPayrollRunRepository } from '../repositories/interfaces';
import { EventPublisher } from '../events/EventPublisher';
import { PayrollRunType } from '../domain/enums';

export class PayrollRunService {
  constructor(
    private payrollRunRepository: IPayrollRunRepository,
    private eventPublisher: EventPublisher
  ) {}

  async createDraftRun(data: {
    organizationId: string;
    companyId?: string;
    periodYear: number;
    periodMonth: number;
    payPeriodStart: Date;
    payPeriodEnd: Date;
    runType?: PayrollRunType;
  }): Promise<PayrollRun> {
    // Check for existing run
    const existingRun = await this.payrollRunRepository.findByPeriod(
      data.periodYear,
      data.periodMonth,
      data.organizationId,
      data.runType
    );
    
    if (existingRun) {
      throw new Error('Payroll run already exists for this period');
    }

    // Create payroll run
    const payrollRun = new PayrollRun({
      organization_id: data.organizationId,
      company_id: data.companyId,
      period_year: data.periodYear,
      period_month: data.periodMonth,
      pay_period_start: data.payPeriodStart,
      pay_period_end: data.payPeriodEnd,
      run_type: data.runType || PayrollRunType.REGULAR,
    });
    
    // Persist to database
    const savedRun = await this.payrollRunRepository.create(payrollRun);
    
    // Publish domain event
    await this.eventPublisher.publish({
      eventType: 'payroll',
      eventName: 'payroll.run_created',
      organizationId: data.organizationId,
      aggregateType: 'payroll_run',
      aggregateId: savedRun.id,
      payload: {
        payrollRunId: savedRun.id,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        runType: savedRun.runType,
      },
    });
    
    return savedRun;
  }

  async getPayrollRun(payrollRunId: string, organizationId: string): Promise<PayrollRun | null> {
    return await this.payrollRunRepository.findById(payrollRunId, organizationId);
  }
}
