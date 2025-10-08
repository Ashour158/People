import Joi from 'joi';

export const payrollValidators = {
  createComponent: Joi.object({
    component_name: Joi.string().required().max(100),
    component_code: Joi.string().required().max(50),
    component_type: Joi.string().required().valid('earning', 'deduction', 'reimbursement'),
    calculation_type: Joi.string().valid('fixed', 'percentage', 'formula').optional(),
    calculation_value: Joi.number().precision(2).optional(),
    is_taxable: Joi.boolean().optional(),
    is_visible_on_payslip: Joi.boolean().optional(),
    display_order: Joi.number().integer().optional()
  }),

  updateComponent: Joi.object({
    component_name: Joi.string().max(100).optional(),
    component_type: Joi.string().valid('earning', 'deduction', 'reimbursement').optional(),
    calculation_type: Joi.string().valid('fixed', 'percentage', 'formula').optional(),
    calculation_value: Joi.number().precision(2).optional(),
    is_taxable: Joi.boolean().optional(),
    is_visible_on_payslip: Joi.boolean().optional(),
    display_order: Joi.number().integer().optional()
  }),

  createEmployeeCompensation: Joi.object({
    employee_id: Joi.string().uuid().required(),
    effective_from_date: Joi.date().required(),
    annual_ctc: Joi.number().required().precision(2).positive(),
    monthly_gross: Joi.number().required().precision(2).positive(),
    salary_type: Joi.string().valid('monthly', 'hourly', 'daily').optional(),
    payment_frequency: Joi.string().valid('monthly', 'bi-weekly', 'weekly').optional(),
    payment_mode: Joi.string().valid('bank_transfer', 'cash', 'cheque').optional()
  }),

  updateEmployeeCompensation: Joi.object({
    annual_ctc: Joi.number().precision(2).positive().optional(),
    monthly_gross: Joi.number().precision(2).positive().optional(),
    salary_type: Joi.string().valid('monthly', 'hourly', 'daily').optional(),
    payment_frequency: Joi.string().valid('monthly', 'bi-weekly', 'weekly').optional(),
    payment_mode: Joi.string().valid('bank_transfer', 'cash', 'cheque').optional()
  }),

  createPayrollRun: Joi.object({
    run_name: Joi.string().required().max(100),
    run_code: Joi.string().required().max(50),
    period_month: Joi.number().integer().min(1).max(12).required(),
    period_year: Joi.number().integer().min(2020).max(2100).required(),
    pay_date: Joi.date().required()
  })
};
