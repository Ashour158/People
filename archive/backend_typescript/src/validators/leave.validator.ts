import Joi from 'joi';

export const applyLeaveSchema = Joi.object({
  leave_type_id: Joi.string().uuid().required(),
  from_date: Joi.date().required(),
  to_date: Joi.date().min(Joi.ref('from_date')).required(),
  is_half_day: Joi.boolean().default(false),
  half_day_session: Joi.string().valid('first_half', 'second_half').when('is_half_day', {
    is: true,
    then: Joi.required()
  }),
  reason: Joi.string().min(10).max(500).required(),
  contact_details: Joi.string().max(255).optional(),
  supporting_document_url: Joi.string().uri().optional()
});

export const approveRejectLeaveSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  comments: Joi.string().max(500).optional(),
  rejection_reason: Joi.string().when('action', {
    is: 'reject',
    then: Joi.required()
  })
});

export const cancelLeaveSchema = Joi.object({
  cancellation_reason: Joi.string().min(10).required()
});
