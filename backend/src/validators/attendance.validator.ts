import Joi from 'joi';

export const checkInSchema = Joi.object({
  check_in_time: Joi.date().default(() => new Date()),
  location: Joi.string().max(255).optional(),
  notes: Joi.string().optional()
});

export const checkOutSchema = Joi.object({
  check_out_time: Joi.date().default(() => new Date()),
  location: Joi.string().max(255).optional(),
  notes: Joi.string().optional()
});

export const regularizationSchema = Joi.object({
  attendance_date: Joi.date().max('now').required(),
  requested_check_in: Joi.date().required(),
  requested_check_out: Joi.date().required(),
  reason: Joi.string().min(10).required(),
  supporting_document_url: Joi.string().uri().optional()
});
