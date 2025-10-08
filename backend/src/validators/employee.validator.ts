import Joi from 'joi';

export const createEmployeeSchema = Joi.object({
  company_id: Joi.string().uuid().required(),
  employee_code: Joi.string().min(2).max(50).optional(), // Make optional for auto-generation
  first_name: Joi.string().min(2).max(100).required(),
  middle_name: Joi.string().max(100).optional().allow(null, ''),
  last_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  personal_email: Joi.string().email().optional().allow(null, ''),
  phone_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).max(20).optional().allow(null, ''),
  date_of_birth: Joi.date().max('now').optional().allow(null),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional().allow(null),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional().allow(null),
  blood_group: Joi.string().max(5).optional().allow(null, ''),
  nationality: Joi.string().max(50).optional().allow(null, ''),
  
  department_id: Joi.string().uuid().optional().allow(null),
  designation_id: Joi.string().uuid().optional().allow(null),
  location_id: Joi.string().uuid().optional().allow(null),
  manager_id: Joi.string().uuid().optional().allow(null),
  
  date_of_joining: Joi.date().required(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern', 'consultant').required(),
  work_location_type: Joi.string().valid('office', 'remote', 'hybrid').optional().allow(null),
  probation_period_months: Joi.number().integer().min(0).max(12).optional(),
  
  emergency_contact_name: Joi.string().max(100).optional().allow(null, ''),
  emergency_contact_phone: Joi.string().max(20).optional().allow(null, ''),
  emergency_contact_relationship: Joi.string().max(50).optional().allow(null, ''),
  
  employee_status: Joi.string().valid('active', 'inactive', 'terminated', 'on_leave', 'on_probation').default('active')
});

export const updateEmployeeSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).optional(),
  middle_name: Joi.string().max(100).optional().allow(null, ''),
  last_name: Joi.string().min(2).max(100).optional(),
  personal_email: Joi.string().email().optional().allow(null, ''),
  phone_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).max(20).optional().allow(null, ''),
  date_of_birth: Joi.date().max('now').optional().allow(null),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional(),
  blood_group: Joi.string().max(5).optional().allow(null, ''),
  nationality: Joi.string().max(50).optional().allow(null, ''),
  
  department_id: Joi.string().uuid().optional().allow(null),
  designation_id: Joi.string().uuid().optional().allow(null),
  location_id: Joi.string().uuid().optional().allow(null),
  manager_id: Joi.string().uuid().optional().allow(null),
  
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern', 'consultant').optional(),
  work_location_type: Joi.string().valid('office', 'remote', 'hybrid').optional(),
  
  emergency_contact_name: Joi.string().max(100).optional().allow(null, ''),
  emergency_contact_phone: Joi.string().max(20).optional().allow(null, ''),
  emergency_contact_relationship: Joi.string().max(50).optional().allow(null, ''),
  
  employee_status: Joi.string().valid('active', 'inactive', 'terminated', 'on_leave', 'on_probation').optional()
});

export const terminateEmployeeSchema = Joi.object({
  termination_date: Joi.date().required(),
  last_working_date: Joi.date().required(),
  termination_reason: Joi.string().min(10).max(500).required(),
  termination_type: Joi.string().valid('voluntary', 'involuntary', 'retirement', 'contract_end').required(),
  is_rehire_eligible: Joi.boolean().optional().default(true),
  exit_notes: Joi.string().max(1000).optional().allow(null, '')
});

export const bulkImportEmployeeSchema = Joi.object({
  employee_code: Joi.string().min(2).max(50).optional(),
  first_name: Joi.string().min(2).max(100).required(),
  middle_name: Joi.string().max(100).optional().allow(null, ''),
  last_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  personal_email: Joi.string().email().optional().allow(null, ''),
  phone_number: Joi.string().max(20).optional().allow(null, ''),
  date_of_birth: Joi.date().max('now').optional().allow(null),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional().allow(null),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional().allow(null),
  blood_group: Joi.string().max(5).optional().allow(null, ''),
  nationality: Joi.string().max(50).optional().allow(null, ''),
  department_name: Joi.string().max(100).optional().allow(null, ''),
  designation_name: Joi.string().max(100).optional().allow(null, ''),
  location_name: Joi.string().max(100).optional().allow(null, ''),
  manager_email: Joi.string().email().optional().allow(null, ''),
  date_of_joining: Joi.date().required(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern', 'consultant').required(),
  work_location_type: Joi.string().valid('office', 'remote', 'hybrid').optional().allow(null),
  probation_period_months: Joi.number().integer().min(0).max(12).optional(),
  emergency_contact_name: Joi.string().max(100).optional().allow(null, ''),
  emergency_contact_phone: Joi.string().max(20).optional().allow(null, ''),
  emergency_contact_relationship: Joi.string().max(50).optional().allow(null, ''),
  employee_status: Joi.string().valid('active', 'inactive', 'on_leave', 'on_probation').default('active')
});

