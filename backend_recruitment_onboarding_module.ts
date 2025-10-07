// =====================================================
// RECRUITMENT & ONBOARDING - BACKEND IMPLEMENTATION
// =====================================================

import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const router = Router();

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const jobRequisitionSchema = Joi.object({
  job_title: Joi.string().required().max(200),
  department_id: Joi.string().uuid(),
  number_of_positions: Joi.number().integer().positive().required(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'internship'),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
  justification: Joi.string().required(),
  required_by_date: Joi.date()
});

const jobPostingSchema = Joi.object({
  requisition_id: Joi.string().uuid().required(),
  job_title: Joi.string().required().max(200),
  job_description: Joi.string().required(),
  requirements: Joi.string(),
  responsibilities: Joi.string(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'internship'),
  experience_required: Joi.string(),
  education_required: Joi.string(),
  salary_range_min: Joi.number().precision(2),
  salary_range_max: Joi.number().precision(2),
  posting_start_date: Joi.date().required(),
  posting_end_date: Joi.date(),
  is_internal: Joi.boolean(),
  is_external: Joi.boolean()
});

const candidateSchema = Joi.object({
  first_name: Joi.string().required().max(100),
  last_name: Joi.string().required().max(100),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20),
  current_location: Joi.string(),
  current_company: Joi.string(),
  current_designation: Joi.string(),
  total_experience_years: Joi.number().precision(1),
  notice_period_days: Joi.number().integer(),
  current_ctc: Joi.number().precision(2),
  expected_ctc: Joi.number().precision(2),
  skills: Joi.string(),
  resume_file_path: Joi.string()
});

const interviewSchema = Joi.object({
  application_id: Joi.string().uuid().required(),
  interview_round: Joi.string().required().max(100),
  interview_type: Joi.string().valid('phone_screen', 'video', 'in_person', 'technical', 'hr', 'managerial'),
  scheduled_date: Joi.date().required(),
  duration_minutes: Joi.number().integer().default(60),
  interviewer_ids: Joi.array().items(Joi.string().uuid()),
  location: Joi.string().allow(''),
  meeting_link: Joi.string().allow(''),
  notes: Joi.string().allow('')
});

const onboardingProgramSchema = Joi.object({
  program_name: Joi.string().required().max(200),
  program_code: Joi.string().required().max(50),
  description: Joi.string().allow(''),
  duration_days: Joi.number().integer().positive(),
  department_id: Joi.string().uuid(),
  designation_id: Joi.string().uuid()
});

const onboardingTaskSchema = Joi.object({
  program_id: Joi.string().uuid().required(),
  task_title: Joi.string().required().max(200),
  task_description: Joi.string(),
  task_category: Joi.string().valid('documentation', 'training', 'system_access', 'orientation', 'equipment', 'other'),
  assigned_to_role: Joi.string().valid('hr', 'it', 'manager', 'buddy', 'employee'),
  due_days_from_joining: Joi.number().integer().required(),
  is_mandatory: Joi.boolean()
});

// =====================================================
// JOB REQUISITIONS ROUTES
// =====================================================

// Get job requisitions
router.get('/recruitment/requisitions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id, company_id } = req.user;
    const { status, priority } = req.query;

    let query = `
      SELECT jr.*, 
        d.department_name,
        e.first_name || ' ' || e.last_name as requested_by_name,
        COALESCE(
          (SELECT COUNT(*) FROM job_postings WHERE requisition_id = jr.requisition_id AND is_deleted = FALSE),
          0
        ) as postings_count
      FROM job_requisitions jr
      LEFT JOIN departments d ON jr.department_id = d.department_id
      LEFT JOIN employees e ON jr.requested_by = e.employee_id
      WHERE jr.organization_id = $1 AND jr.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (company_id) {
      query += ` AND (jr.company_id = $${params.length + 1} OR jr.company_id IS NULL)`;
      params.push(company_id);
    }

    if (status) {
      query += ` AND jr.status = $${params.length + 1}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND jr.priority = $${params.length + 1}`;
      params.push(priority);
    }

    query += ` ORDER BY jr.created_at DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create job requisition
router.post('/recruitment/requisitions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = jobRequisitionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, company_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO job_requisitions (
        organization_id, company_id, job_title, department_id,
        number_of_positions, employment_type, priority, justification,
        required_by_date, requested_by, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      organization_id, company_id, value.job_title, value.department_id,
      value.number_of_positions, value.employment_type, value.priority,
      value.justification, value.required_by_date, user_id, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Approve/Reject requisition
router.post('/recruitment/requisitions/:requisition_id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requisition_id } = req.params;
    const { action, rejection_reason } = req.body; // action: 'approve' or 'reject'
    const { organization_id, user_id } = req.user;

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await req.db.query(`
      UPDATE job_requisitions
      SET status = $1,
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = $3,
          modified_by = $4,
          modified_at = CURRENT_TIMESTAMP
      WHERE requisition_id = $5 AND organization_id = $6 AND is_deleted = FALSE
      RETURNING *
    `, [newStatus, user_id, rejection_reason, user_id, requisition_id, organization_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Requisition not found' });
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
// JOB POSTINGS ROUTES
// =====================================================

// Get job postings
router.get('/recruitment/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { status, is_active } = req.query;

    let query = `
      SELECT jp.*, 
        jr.number_of_positions,
        d.department_name,
        l.location_name,
        COALESCE(
          (SELECT COUNT(*) FROM job_applications WHERE job_posting_id = jp.posting_id AND is_deleted = FALSE),
          0
        ) as applications_count
      FROM job_postings jp
      JOIN job_requisitions jr ON jp.requisition_id = jr.requisition_id
      LEFT JOIN departments d ON jp.department_id = d.department_id
      LEFT JOIN locations l ON jp.location_id = l.location_id
      WHERE jp.organization_id = $1 AND jp.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (status) {
      query += ` AND jp.status = $${params.length + 1}`;
      params.push(status);
    }

    if (is_active !== undefined) {
      query += ` AND jp.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY jp.posting_start_date DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create job posting
router.post('/recruitment/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = jobPostingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, company_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO job_postings (
        organization_id, company_id, requisition_id, job_title,
        job_description, requirements, responsibilities, employment_type,
        experience_required, education_required, salary_range_min, salary_range_max,
        posting_start_date, posting_end_date, is_internal, is_external, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      organization_id, company_id, value.requisition_id, value.job_title,
      value.job_description, value.requirements, value.responsibilities,
      value.employment_type, value.experience_required, value.education_required,
      value.salary_range_min, value.salary_range_max, value.posting_start_date,
      value.posting_end_date, value.is_internal, value.is_external, user_id
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
// CANDIDATES ROUTES
// =====================================================

// Get candidates
router.get('/recruitment/candidates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { status, source } = req.query;

    let query = `
      SELECT c.*,
        COALESCE(
          (SELECT COUNT(*) FROM job_applications WHERE candidate_id = c.candidate_id AND is_deleted = FALSE),
          0
        ) as applications_count
      FROM candidates c
      WHERE c.organization_id = $1 AND c.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (status) {
      query += ` AND c.status = $${params.length + 1}`;
      params.push(status);
    }

    if (source) {
      query += ` AND c.source = $${params.length + 1}`;
      params.push(source);
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create candidate
router.post('/recruitment/candidates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = candidateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO candidates (
        organization_id, first_name, last_name, email, phone,
        current_location, current_company, current_designation,
        total_experience_years, notice_period_days, current_ctc, expected_ctc,
        skills, resume_file_path, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      organization_id, value.first_name, value.last_name, value.email, value.phone,
      value.current_location, value.current_company, value.current_designation,
      value.total_experience_years, value.notice_period_days, value.current_ctc,
      value.expected_ctc, value.skills, value.resume_file_path, user_id
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
// JOB APPLICATIONS ROUTES
// =====================================================

// Get applications
router.get('/recruitment/applications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { job_posting_id, status } = req.query;

    let query = `
      SELECT ja.*, 
        c.first_name, c.last_name, c.email, c.phone, c.resume_file_path,
        jp.job_title,
        COALESCE(
          (SELECT COUNT(*) FROM interview_schedules WHERE application_id = ja.application_id AND is_deleted = FALSE),
          0
        ) as interviews_count
      FROM job_applications ja
      JOIN candidates c ON ja.candidate_id = c.candidate_id
      JOIN job_postings jp ON ja.job_posting_id = jp.posting_id
      WHERE ja.organization_id = $1 AND ja.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (job_posting_id) {
      query += ` AND ja.job_posting_id = $${params.length + 1}`;
      params.push(job_posting_id);
    }

    if (status) {
      query += ` AND ja.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY ja.applied_at DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create application
router.post('/recruitment/applications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { candidate_id, job_posting_id, cover_letter } = req.body;
    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO job_applications (
        organization_id, candidate_id, job_posting_id, cover_letter, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [organization_id, candidate_id, job_posting_id, cover_letter, user_id]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update application status
router.patch('/recruitment/applications/:application_id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { application_id } = req.params;
    const { status, rejection_reason } = req.body;
    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      UPDATE job_applications
      SET status = $1,
          rejection_reason = $2,
          modified_by = $3,
          modified_at = CURRENT_TIMESTAMP
      WHERE application_id = $4 AND organization_id = $5 AND is_deleted = FALSE
      RETURNING *
    `, [status, rejection_reason, user_id, application_id, organization_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
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
// INTERVIEW SCHEDULES ROUTES
// =====================================================

// Get interview schedules
router.get('/recruitment/interviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { application_id, status, date } = req.query;

    let query = `
      SELECT is.*, 
        ja.application_id,
        c.first_name, c.last_name, c.email,
        jp.job_title,
        ir.round_name
      FROM interview_schedules is
      JOIN job_applications ja ON is.application_id = ja.application_id
      JOIN candidates c ON ja.candidate_id = c.candidate_id
      JOIN job_postings jp ON ja.job_posting_id = jp.posting_id
      LEFT JOIN interview_rounds ir ON is.round_id = ir.round_id
      WHERE is.organization_id = $1 AND is.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (application_id) {
      query += ` AND is.application_id = $${params.length + 1}`;
      params.push(application_id);
    }

    if (status) {
      query += ` AND is.status = $${params.length + 1}`;
      params.push(status);
    }

    if (date) {
      query += ` AND DATE(is.scheduled_date) = $${params.length + 1}`;
      params.push(date);
    }

    query += ` ORDER BY is.scheduled_date ASC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Schedule interview
router.post('/recruitment/interviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = interviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO interview_schedules (
        organization_id, application_id, interview_round, interview_type,
        scheduled_date, duration_minutes, location, meeting_link, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      organization_id, value.application_id, value.interview_round,
      value.interview_type, value.scheduled_date, value.duration_minutes,
      value.location, value.meeting_link, value.notes, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Submit interview feedback
router.post('/recruitment/interviews/:interview_id/feedback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { interview_id } = req.params;
    const { rating, feedback_text, recommendation, strengths, weaknesses } = req.body;
    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO interview_feedback (
        organization_id, interview_id, interviewer_id, rating,
        feedback_text, recommendation, strengths, weaknesses, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      organization_id, interview_id, user_id, rating,
      feedback_text, recommendation, strengths, weaknesses, user_id
    ]);

    // Update interview status to completed
    await req.db.query(`
      UPDATE interview_schedules
      SET status = 'completed', modified_at = CURRENT_TIMESTAMP
      WHERE schedule_id = $1
    `, [interview_id]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// ONBOARDING PROGRAMS ROUTES
// =====================================================

// Get onboarding programs
router.get('/onboarding/programs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;

    const query = `
      SELECT op.*, 
        d.department_name,
        des.designation_name,
        COALESCE(
          (SELECT COUNT(*) FROM onboarding_tasks WHERE program_id = op.program_id AND is_deleted = FALSE),
          0
        ) as tasks_count
      FROM onboarding_programs op
      LEFT JOIN departments d ON op.department_id = d.department_id
      LEFT JOIN designations des ON op.designation_id = des.designation_id
      WHERE op.organization_id = $1 AND op.is_deleted = FALSE
      ORDER BY op.created_at DESC
    `;

    const result = await req.db.query(query, [organization_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create onboarding program
router.post('/onboarding/programs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = onboardingProgramSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, company_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO onboarding_programs (
        organization_id, company_id, program_name, program_code, description,
        duration_days, department_id, designation_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      organization_id, company_id, value.program_name, value.program_code,
      value.description, value.duration_days, value.department_id,
      value.designation_id, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get program tasks
router.get('/onboarding/programs/:program_id/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { program_id } = req.params;
    const { organization_id } = req.user;

    const result = await req.db.query(`
      SELECT * FROM onboarding_tasks
      WHERE program_id = $1 AND is_deleted = FALSE
      ORDER BY due_days_from_joining, task_order
    `, [program_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Add task to program
router.post('/onboarding/programs/:program_id/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { program_id } = req.params;
    const { error, value } = onboardingTaskSchema.validate({ ...req.body, program_id });
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO onboarding_tasks (
        program_id, task_title, task_description, task_category,
        assigned_to_role, due_days_from_joining, is_mandatory, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      program_id, value.task_title, value.task_description, value.task_category,
      value.assigned_to_role, value.due_days_from_joining, value.is_mandatory, user_id
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
// EMPLOYEE ONBOARDING ROUTES
// =====================================================

// Get employee onboarding
router.get('/onboarding/employees/:employee_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employee_id } = req.params;
    const { organization_id } = req.user;

    const onboardingResult = await req.db.query(`
      SELECT eo.*, 
        op.program_name,
        e.first_name, e.last_name, e.email,
        buddy.first_name || ' ' || buddy.last_name as buddy_name
      FROM employee_onboarding eo
      JOIN onboarding_programs op ON eo.program_id = op.program_id
      JOIN employees e ON eo.employee_id = e.employee_id
      LEFT JOIN employees buddy ON eo.buddy_id = buddy.employee_id
      WHERE eo.employee_id = $1 AND eo.organization_id = $2
    `, [employee_id, organization_id]);

    if (onboardingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Onboarding not found' });
    }

    // Get task progress
    const tasksResult = await req.db.query(`
      SELECT otp.*, ot.task_title, ot.task_description, ot.task_category, 
             ot.assigned_to_role, ot.is_mandatory
      FROM onboarding_task_progress otp
      JOIN onboarding_tasks ot ON otp.task_id = ot.task_id
      WHERE otp.employee_onboarding_id = $1
      ORDER BY ot.due_days_from_joining, ot.task_order
    `, [onboardingResult.rows[0].employee_onboarding_id]);

    res.json({
      success: true,
      data: {
        ...onboardingResult.rows[0],
        tasks: tasksResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// Complete onboarding task
router.put('/onboarding/tasks/:task_progress_id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { task_progress_id } = req.params;
    const { completion_notes } = req.body;
    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      UPDATE onboarding_task_progress
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          completed_by = $1,
          completion_notes = $2,
          modified_at = CURRENT_TIMESTAMP
      WHERE task_progress_id = $3
      RETURNING *
    `, [user_id, completion_notes, task_progress_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
