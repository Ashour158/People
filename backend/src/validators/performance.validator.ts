import Joi from 'joi';

export const performanceValidators = {
  createCycle: Joi.object({
    cycle_name: Joi.string().required().max(100),
    cycle_code: Joi.string().required().max(50),
    cycle_type: Joi.string().required().valid('annual', 'semi_annual', 'quarterly', 'monthly', 'probation'),
    start_date: Joi.date().required(),
    end_date: Joi.date().required().greater(Joi.ref('start_date')),
    review_start_date: Joi.date().optional(),
    review_end_date: Joi.date().optional(),
    description: Joi.string().allow('').optional()
  }),

  updateCycle: Joi.object({
    cycle_name: Joi.string().max(100).optional(),
    cycle_type: Joi.string().valid('annual', 'semi_annual', 'quarterly', 'monthly', 'probation').optional(),
    start_date: Joi.date().optional(),
    end_date: Joi.date().optional(),
    review_start_date: Joi.date().optional(),
    review_end_date: Joi.date().optional(),
    description: Joi.string().allow('').optional()
  }),

  createGoal: Joi.object({
    employee_id: Joi.string().uuid().required(),
    cycle_id: Joi.string().uuid().optional(),
    goal_title: Joi.string().required().max(200),
    goal_description: Joi.string().allow('').optional(),
    goal_category: Joi.string().valid('individual', 'team', 'departmental', 'organizational').optional(),
    goal_type: Joi.string().valid('performance', 'development', 'project', 'stretch').optional(),
    start_date: Joi.date().required(),
    end_date: Joi.date().required().greater(Joi.ref('start_date')),
    target_value: Joi.string().optional(),
    weight_percentage: Joi.number().min(0).max(100).optional()
  }),

  updateGoal: Joi.object({
    goal_title: Joi.string().max(200).optional(),
    goal_description: Joi.string().allow('').optional(),
    goal_category: Joi.string().valid('individual', 'team', 'departmental', 'organizational').optional(),
    goal_type: Joi.string().valid('performance', 'development', 'project', 'stretch').optional(),
    start_date: Joi.date().optional(),
    end_date: Joi.date().optional(),
    target_value: Joi.string().optional(),
    weight_percentage: Joi.number().min(0).max(100).optional()
  }),

  updateProgress: Joi.object({
    progress_percentage: Joi.number().min(0).max(100).required(),
    actual_value: Joi.string().optional(),
    progress_notes: Joi.string().allow('').optional()
  }),

  createReview: Joi.object({
    employee_id: Joi.string().uuid().required(),
    reviewer_id: Joi.string().uuid().required(),
    cycle_id: Joi.string().uuid().required(),
    review_type: Joi.string().required().valid('self', 'manager', 'peer', '360'),
    review_period_start: Joi.date().required(),
    review_period_end: Joi.date().required().greater(Joi.ref('review_period_start'))
  }),

  updateReview: Joi.object({
    overall_rating: Joi.number().min(1).max(5).optional(),
    strengths: Joi.string().allow('').optional(),
    areas_of_improvement: Joi.string().allow('').optional(),
    reviewer_comments: Joi.string().allow('').optional(),
    employee_comments: Joi.string().allow('').optional()
  }),

  createFeedback: Joi.object({
    employee_id: Joi.string().uuid().required(),
    feedback_from_employee_id: Joi.string().uuid().required(),
    feedback_type: Joi.string().required().valid('positive', 'constructive', 'developmental'),
    feedback_category: Joi.string().valid('technical', 'behavioral', 'leadership', 'communication').optional(),
    feedback_text: Joi.string().required().max(2000),
    is_anonymous: Joi.boolean().optional()
  })
};
