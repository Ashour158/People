import Joi from 'joi';

export const recruitmentValidators = {
  createJob: Joi.object({
    job_title: Joi.string().required().max(200),
    job_code: Joi.string().required().max(50),
    department_id: Joi.string().uuid().optional(),
    location_id: Joi.string().uuid().optional(),
    employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern').required(),
    experience_level: Joi.string().valid('entry', 'mid', 'senior', 'lead', 'executive').optional(),
    job_description: Joi.string().required(),
    required_skills: Joi.string().optional()
  }),

  updateJob: Joi.object({
    job_title: Joi.string().max(200).optional(),
    job_description: Joi.string().optional(),
    required_skills: Joi.string().optional(),
    employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern').optional()
  }),

  createCandidate: Joi.object({
    first_name: Joi.string().required().max(100),
    last_name: Joi.string().required().max(100),
    email: Joi.string().email().required(),
    phone_number: Joi.string().max(20).optional(),
    resume_url: Joi.string().uri().optional()
  }),

  updateCandidate: Joi.object({
    first_name: Joi.string().max(100).optional(),
    last_name: Joi.string().max(100).optional(),
    email: Joi.string().email().optional(),
    phone_number: Joi.string().max(20).optional()
  }),

  createApplication: Joi.object({
    job_posting_id: Joi.string().uuid().required(),
    candidate_id: Joi.string().uuid().required()
  }),

  updateApplicationStatus: Joi.object({
    status: Joi.string().required().valid('applied', 'screening', 'interview', 'offered', 'hired', 'rejected')
  }),

  scheduleInterview: Joi.object({
    application_id: Joi.string().uuid().required(),
    interview_type: Joi.string().required().valid('phone', 'video', 'in_person', 'technical', 'hr'),
    scheduled_date: Joi.date().required()
  }),

  updateInterview: Joi.object({
    scheduled_date: Joi.date().optional(),
    interview_status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'rescheduled').optional()
  }),

  addInterviewFeedback: Joi.object({
    feedback: Joi.string().required().max(2000),
    rating: Joi.number().min(1).max(5).optional()
  })
};
