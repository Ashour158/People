import Joi from 'joi';

export const createEmployeeSchema = Joi.object({
  company_id: Joi.string().uuid().required(),
  employee_code: Joi.string().min(2).max(50).required(),
  first_name: Joi.string().min(2).max(50).required(),
  middle_name: Joi.string().max(50).optional(),
  last_name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone_number: Joi.string().max(20).optional(),
  date_of_birth: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  department_id: Joi.string().uuid().optional(),
  designation_id: Joi.string().uuid().optional(),
  location_id: Joi.string().uuid().optional(),
  manager_id: Joi.string().uuid().optional(),
  date_of_joining: Joi.date().required(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern').required(),
  employee_status: Joi.string().valid('active', 'inactive', 'terminated', 'on_leave').default('active')
});

export const updateEmployeeSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).optional(),
  middle_name: Joi.string().max(50).optional(),
  last_name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  phone_number: Joi.string().max(20).optional(),
  date_of_birth: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  department_id: Joi.string().uuid().optional(),
  designation_id: Joi.string().uuid().optional(),
  location_id: Joi.string().uuid().optional(),
  manager_id: Joi.string().uuid().optional(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern').optional(),
  employee_status: Joi.string().valid('active', 'inactive', 'terminated', 'on_leave').optional()
});
