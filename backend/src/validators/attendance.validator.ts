import Joi from 'joi';

export const checkInSchema = Joi.object({
  check_in_time: Joi.date().default(() => new Date()),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  location: Joi.string().max(255).optional(),
  ip_address: Joi.string().ip().optional(),
  device: Joi.string().max(100).optional(),
  photo_url: Joi.string().uri().optional(),
  work_type: Joi.string().valid('office', 'remote', 'client_site', 'field_work').default('office'),
  notes: Joi.string().max(500).optional()
});

export const checkOutSchema = Joi.object({
  check_out_time: Joi.date().default(() => new Date()),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  location: Joi.string().max(255).optional(),
  notes: Joi.string().max(500).optional()
});

export const regularizationSchema = Joi.object({
  attendance_date: Joi.date().max('now').required(),
  requested_check_in: Joi.date().required(),
  requested_check_out: Joi.date().required(),
  reason: Joi.string().min(10).max(500).required(),
  supporting_document_url: Joi.string().uri().optional().allow(null, '')
});

export const processRegularizationSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  comments: Joi.string().max(500).optional().allow(null, '')
});

export const bulkMarkAttendanceSchema = Joi.object({
  attendance_records: Joi.array().items(
    Joi.object({
      employee_id: Joi.string().uuid().required(),
      attendance_date: Joi.date().required(),
      attendance_status: Joi.string().valid('present', 'absent', 'on_leave', 'half_day', 'holiday').required(),
      notes: Joi.string().max(500).optional()
    })
  ).min(1).required()
});

