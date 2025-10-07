// =====================================================
// PERFORMANCE REVIEW SYSTEM - BACKEND IMPLEMENTATION
// =====================================================

import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const router = Router();

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const performanceCycleSchema = Joi.object({
  cycle_name: Joi.string().required().max(100),
  cycle_code: Joi.string().required().max(50),
  cycle_type: Joi.string().valid('annual', 'semi_annual', 'quarterly', 'monthly', 'probation'),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  review_start_date: Joi.date(),
  review_end_date: Joi.date(),
  self_assessment_start_date: Joi.date(),
  self_assessment_end_date: Joi.date(),
  manager_review_start_date: Joi.date(),
  manager_review_end_date: Joi.date(),
  description: Joi.string().allow(''),
  enable_self_assessment: Joi.boolean(),
  enable_peer_review: Joi.boolean(),
  enable_360_review: Joi.boolean()
});

const goalSchema = Joi.object({
  employee_id: Joi.string().uuid().required(),
  cycle_id: Joi.string().uuid(),
  goal_title: Joi.string().required().max(200),
  goal_description: Joi.string().allow(''),
  goal_category: Joi.string().valid('individual', 'team', 'departmental', 'organizational'),
  goal_type: Joi.string().valid('performance', 'development', 'project', 'stretch'),
  measurement_criteria: Joi.string(),
  target_value: Joi.string(),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  weight_percentage: Joi.number().min(0).max(100)
});

const reviewSchema = Joi.object({
  employee_id: Joi.string().uuid().required(),
  reviewer_id: Joi.string().uuid().required(),
  cycle_id: Joi.string().uuid().required(),
  review_type: Joi.string().required().valid('self', 'manager', 'peer', '360'),
  overall_rating: Joi.number().min(1).max(5),
  strengths: Joi.string().allow(''),
  areas_of_improvement: Joi.string().allow(''),
  achievements: Joi.string().allow(''),
  manager_comments: Joi.string().allow(''),
  employee_comments: Joi.string().allow('')
});

const feedbackSchema = Joi.object({
  feedback_for_employee_id: Joi.string().uuid().required(),
  feedback_type: Joi.string().required().valid('positive', 'constructive', 'peer', 'manager', '360'),
  feedback_category: Joi.string().valid('work_quality', 'communication', 'teamwork', 'leadership', 'technical', 'other'),
  feedback_text: Joi.string().required(),
  is_anonymous: Joi.boolean()
});

// =====================================================
// PERFORMANCE CYCLES ROUTES
// =====================================================

// Get all performance cycles
router.get('/performance/cycles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { status } = req.query;

    let query = `
      SELECT * FROM performance_cycles
      WHERE organization_id = $1 AND is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY start_date DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create performance cycle
router.post('/performance/cycles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = performanceCycleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, company_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO performance_cycles (
        organization_id, company_id, cycle_name, cycle_code, cycle_type,
        start_date, end_date, review_start_date, review_end_date,
        self_assessment_start_date, self_assessment_end_date,
        manager_review_start_date, manager_review_end_date,
        description, enable_self_assessment, enable_peer_review, 
        enable_360_review, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      organization_id, company_id, value.cycle_name, value.cycle_code, value.cycle_type,
      value.start_date, value.end_date, value.review_start_date, value.review_end_date,
      value.self_assessment_start_date, value.self_assessment_end_date,
      value.manager_review_start_date, value.manager_review_end_date,
      value.description, value.enable_self_assessment, value.enable_peer_review,
      value.enable_360_review, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update cycle status
router.patch('/performance/cycles/:cycle_id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cycle_id } = req.params;
    const { status } = req.body;
    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      UPDATE performance_cycles
      SET status = $1, modified_by = $2, modified_at = CURRENT_TIMESTAMP
      WHERE cycle_id = $3 AND organization_id = $4 AND is_deleted = FALSE
      RETURNING *
    `, [status, user_id, cycle_id, organization_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Performance cycle not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// GOALS ROUTES
// =====================================================

// Get goals
router.get('/performance/goals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id, user_id } = req.user;
    const { employee_id, cycle_id, status } = req.query;

    let query = `
      SELECT g.*, 
        e.employee_code, e.first_name, e.last_name,
        pc.cycle_name,
        COALESCE(
          (SELECT COUNT(*) FROM goal_check_ins WHERE goal_id = g.goal_id),
          0
        ) as check_in_count
      FROM goals g
      JOIN employees e ON g.employee_id = e.employee_id
      LEFT JOIN performance_cycles pc ON g.cycle_id = pc.cycle_id
      WHERE g.organization_id = $1 AND g.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (employee_id) {
      query += ` AND g.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }

    if (cycle_id) {
      query += ` AND g.cycle_id = $${params.length + 1}`;
      params.push(cycle_id);
    }

    if (status) {
      query += ` AND g.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY g.created_at DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create goal
router.post('/performance/goals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = goalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO goals (
        organization_id, employee_id, cycle_id, goal_title, goal_description,
        goal_category, goal_type, measurement_criteria, target_value,
        start_date, end_date, weight_percentage, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      organization_id, value.employee_id, value.cycle_id, value.goal_title,
      value.goal_description, value.goal_category, value.goal_type,
      value.measurement_criteria, value.target_value, value.start_date,
      value.end_date, value.weight_percentage, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update goal status
router.patch('/performance/goals/:goal_id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goal_id } = req.params;
    const { status, completion_percentage } = req.body;
    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      UPDATE goals
      SET status = $1, 
          completion_percentage = $2,
          modified_by = $3, 
          modified_at = CURRENT_TIMESTAMP
      WHERE goal_id = $4 AND organization_id = $5 AND is_deleted = FALSE
      RETURNING *
    `, [status, completion_percentage, user_id, goal_id, organization_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Add goal check-in
router.post('/performance/goals/:goal_id/check-ins', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goal_id } = req.params;
    const { progress_percentage, progress_notes } = req.body;
    const { organization_id, user_id } = req.user;

    // Verify goal exists
    const goalCheck = await req.db.query(`
      SELECT * FROM goals WHERE goal_id = $1 AND organization_id = $2 AND is_deleted = FALSE
    `, [goal_id, organization_id]);

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const result = await req.db.query(`
      INSERT INTO goal_check_ins (goal_id, progress_percentage, progress_notes, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [goal_id, progress_percentage, progress_notes, user_id]);

    // Update goal completion percentage
    await req.db.query(`
      UPDATE goals SET completion_percentage = $1, modified_at = CURRENT_TIMESTAMP
      WHERE goal_id = $2
    `, [progress_percentage, goal_id]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PERFORMANCE REVIEWS ROUTES
// =====================================================

// Get reviews
router.get('/performance/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { employee_id, cycle_id, review_type, status } = req.query;

    let query = `
      SELECT pr.*, 
        e.employee_code, e.first_name, e.last_name,
        r.first_name as reviewer_first_name, r.last_name as reviewer_last_name,
        pc.cycle_name
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.employee_id
      JOIN employees r ON pr.reviewer_id = r.employee_id
      LEFT JOIN performance_cycles pc ON pr.cycle_id = pc.cycle_id
      WHERE pr.organization_id = $1 AND pr.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (employee_id) {
      query += ` AND pr.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }

    if (cycle_id) {
      query += ` AND pr.cycle_id = $${params.length + 1}`;
      params.push(cycle_id);
    }

    if (review_type) {
      query += ` AND pr.review_type = $${params.length + 1}`;
      params.push(review_type);
    }

    if (status) {
      query += ` AND pr.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY pr.created_at DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create review
router.post('/performance/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = reviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO performance_reviews (
        organization_id, employee_id, reviewer_id, cycle_id, review_type,
        overall_rating, strengths, areas_of_improvement, achievements,
        manager_comments, employee_comments, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      organization_id, value.employee_id, value.reviewer_id, value.cycle_id,
      value.review_type, value.overall_rating, value.strengths,
      value.areas_of_improvement, value.achievements, value.manager_comments,
      value.employee_comments, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Submit review
router.post('/performance/reviews/:review_id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { review_id } = req.params;
    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      UPDATE performance_reviews
      SET status = 'submitted',
          submitted_date = CURRENT_TIMESTAMP,
          modified_by = $1,
          modified_at = CURRENT_TIMESTAMP
      WHERE review_id = $2 AND organization_id = $3 AND is_deleted = FALSE
      RETURNING *
    `, [user_id, review_id, organization_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Acknowledge review (employee acknowledges)
router.post('/performance/reviews/:review_id/acknowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { review_id } = req.params;
    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      UPDATE performance_reviews
      SET acknowledged_by_employee = TRUE,
          employee_acknowledgement_date = CURRENT_TIMESTAMP,
          modified_at = CURRENT_TIMESTAMP
      WHERE review_id = $1 AND organization_id = $2 AND is_deleted = FALSE
      RETURNING *
    `, [review_id, organization_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// FEEDBACK ROUTES
// =====================================================

// Get feedback
router.get('/performance/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id, user_id } = req.user;
    const { employee_id, feedback_type } = req.query;

    let query = `
      SELECT f.*, 
        e.employee_code, e.first_name, e.last_name,
        CASE WHEN f.is_anonymous THEN 'Anonymous' 
             ELSE fb.first_name || ' ' || fb.last_name 
        END as feedback_by_name
      FROM feedback f
      JOIN employees e ON f.feedback_for_employee_id = e.employee_id
      LEFT JOIN employees fb ON f.feedback_by_employee_id = fb.employee_id
      WHERE f.organization_id = $1 AND f.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (employee_id) {
      query += ` AND f.feedback_for_employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }

    if (feedback_type) {
      query += ` AND f.feedback_type = $${params.length + 1}`;
      params.push(feedback_type);
    }

    query += ` ORDER BY f.created_at DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Give feedback
router.post('/performance/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = feedbackSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO feedback (
        organization_id, feedback_for_employee_id, feedback_by_employee_id,
        feedback_type, feedback_category, feedback_text, is_anonymous, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      organization_id, value.feedback_for_employee_id, 
      value.is_anonymous ? null : user_id,
      value.feedback_type, value.feedback_category, value.feedback_text,
      value.is_anonymous || false, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// DASHBOARD & ANALYTICS
// =====================================================

// Get performance dashboard
router.get('/performance/dashboard/:employee_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employee_id } = req.params;
    const { organization_id } = req.user;

    // Get active goals count
    const goalsResult = await req.db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'in_progress') as active_goals,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_goals,
        AVG(completion_percentage) as avg_progress
      FROM goals
      WHERE employee_id = $1 AND organization_id = $2 AND is_deleted = FALSE
    `, [employee_id, organization_id]);

    // Get recent reviews
    const reviewsResult = await req.db.query(`
      SELECT AVG(overall_rating) as avg_rating, COUNT(*) as total_reviews
      FROM performance_reviews
      WHERE employee_id = $1 AND organization_id = $2 
        AND status = 'completed' AND is_deleted = FALSE
    `, [employee_id, organization_id]);

    // Get recent feedback
    const feedbackResult = await req.db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE feedback_type = 'positive') as positive_count,
        COUNT(*) FILTER (WHERE feedback_type = 'constructive') as constructive_count
      FROM feedback
      WHERE feedback_for_employee_id = $1 AND organization_id = $2 AND is_deleted = FALSE
    `, [employee_id, organization_id]);

    res.json({
      success: true,
      data: {
        goals: goalsResult.rows[0],
        reviews: reviewsResult.rows[0],
        feedback: feedbackResult.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
