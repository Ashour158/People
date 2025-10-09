import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler';

interface PerformanceCycle {
  cycle_id: string;
  organization_id: string;
  cycle_name: string;
  cycle_type: 'annual' | 'semi_annual' | 'quarterly' | 'monthly';
  start_date: Date;
  end_date: Date;
  review_start_date?: Date;
  review_end_date?: Date;
  status: 'draft' | 'active' | 'completed' | 'archived';
  enable_self_assessment: boolean;
  enable_peer_review: boolean;
  enable_360_review: boolean;
  created_by: string;
  created_at: Date;
}

interface Goal {
  goal_id: string;
  employee_id: string;
  cycle_id?: string;
  goal_title: string;
  goal_description?: string;
  goal_type: 'okr' | 'kpi' | 'smart' | 'project' | 'learning';
  category: 'individual' | 'team' | 'organizational';
  parent_goal_id?: string;
  start_date: Date;
  target_date: Date;
  progress_percentage: number;
  status: 'draft' | 'active' | 'on_track' | 'at_risk' | 'behind' | 'completed' | 'cancelled';
  metric_type?: 'number' | 'percentage' | 'boolean' | 'currency';
  target_value?: number;
  current_value?: number;
  weight_percentage?: number;
  aligned_to?: string;
  created_by: string;
  created_at: Date;
}

interface PerformanceReview {
  review_id: string;
  employee_id: string;
  cycle_id: string;
  reviewer_id: string;
  review_type: 'self' | 'manager' | 'peer' | '360';
  review_status: 'draft' | 'submitted' | 'completed' | 'acknowledged';
  overall_rating?: number;
  competency_rating?: number;
  goal_achievement_rating?: number;
  strengths?: string;
  areas_of_improvement?: string;
  achievements?: string;
  development_areas?: string;
  comments?: string;
  submitted_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

interface Feedback {
  feedback_id: string;
  feedback_for_employee_id: string;
  feedback_from_employee_id?: string;
  feedback_type: 'positive' | 'constructive' | 'peer' | 'manager' | '360';
  feedback_category?: string;
  feedback_text: string;
  is_anonymous: boolean;
  visibility: 'private' | 'manager' | 'employee' | 'public';
  created_at: Date;
}

interface CompetencyMapping {
  mapping_id: string;
  employee_id: string;
  competency_id: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  assessment_date: Date;
  assessed_by: string;
  target_level?: string;
  notes?: string;
  created_at: Date;
}

export class PerformanceService {
  constructor(private db: Pool) {}

  // ==================== PERFORMANCE CYCLES ====================

  async createPerformanceCycle(data: {
    organization_id: string;
    cycle_name: string;
    cycle_type: string;
    start_date: Date;
    end_date: Date;
    review_start_date?: Date;
    review_end_date?: Date;
    enable_self_assessment?: boolean;
    enable_peer_review?: boolean;
    enable_360_review?: boolean;
    created_by: string;
  }): Promise<PerformanceCycle> {
    const cycle_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO performance_cycles (
        cycle_id, organization_id, cycle_name, cycle_type,
        start_date, end_date, review_start_date, review_end_date,
        status, enable_self_assessment, enable_peer_review, enable_360_review, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        cycle_id,
        data.organization_id,
        data.cycle_name,
        data.cycle_type,
        data.start_date,
        data.end_date,
        data.review_start_date,
        data.review_end_date,
        'active',
        data.enable_self_assessment ?? true,
        data.enable_peer_review ?? false,
        data.enable_360_review ?? false,
        data.created_by,
      ]
    );

    return result.rows[0];
  }

  async getPerformanceCycles(
    organization_id: string,
    filters?: { status?: string }
  ): Promise<PerformanceCycle[]> {
    let query = `
      SELECT * FROM performance_cycles
      WHERE organization_id = $1 AND is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (filters?.status) {
      query += ` AND status = $2`;
      params.push(filters.status);
    }

    query += ` ORDER BY start_date DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  // ==================== GOALS (OKR/KPI) ====================

  async createGoal(data: {
    employee_id: string;
    organization_id: string;
    cycle_id?: string;
    goal_title: string;
    goal_description?: string;
    goal_type: string;
    category: string;
    parent_goal_id?: string;
    start_date: Date;
    target_date: Date;
    metric_type?: string;
    target_value?: number;
    weight_percentage?: number;
    aligned_to?: string;
    created_by: string;
  }): Promise<Goal> {
    const goal_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO performance_goals (
        goal_id, employee_id, cycle_id, goal_title, goal_description,
        goal_type, category, parent_goal_id, start_date, target_date,
        progress_percentage, status, metric_type, target_value, current_value,
        weight_percentage, aligned_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        goal_id,
        data.employee_id,
        data.cycle_id,
        data.goal_title,
        data.goal_description,
        data.goal_type,
        data.category,
        data.parent_goal_id,
        data.start_date,
        data.target_date,
        0,
        'active',
        data.metric_type,
        data.target_value,
        0,
        data.weight_percentage,
        data.aligned_to,
        data.created_by,
      ]
    );

    return result.rows[0];
  }

  async getEmployeeGoals(
    employee_id: string,
    organization_id: string,
    filters?: { cycle_id?: string; status?: string }
  ): Promise<Goal[]> {
    let query = `
      SELECT 
        pg.*,
        e.first_name || ' ' || e.last_name as employee_name,
        CASE WHEN pg.parent_goal_id IS NOT NULL
          THEN (SELECT goal_title FROM performance_goals WHERE goal_id = pg.parent_goal_id)
          ELSE NULL
        END as parent_goal_title
      FROM performance_goals pg
      INNER JOIN employees e ON pg.employee_id = e.employee_id
      WHERE pg.employee_id = $1 
        AND e.organization_id = $2
        AND pg.is_deleted = FALSE
    `;
    const params: any[] = [employee_id, organization_id];
    let paramCounter = 3;

    if (filters?.cycle_id) {
      query += ` AND pg.cycle_id = $${paramCounter}`;
      params.push(filters.cycle_id);
      paramCounter++;
    }

    if (filters?.status) {
      query += ` AND pg.status = $${paramCounter}`;
      params.push(filters.status);
      paramCounter++;
    }

    query += ` ORDER BY pg.start_date DESC, pg.weight_percentage DESC NULLS LAST`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async updateGoalProgress(
    goal_id: string,
    employee_id: string,
    data: {
      current_value?: number;
      progress_percentage?: number;
      status?: string;
      notes?: string;
    }
  ): Promise<Goal> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    if (data.current_value !== undefined) {
      updateFields.push(`current_value = $${paramCounter}`);
      params.push(data.current_value);
      paramCounter++;
    }

    if (data.progress_percentage !== undefined) {
      updateFields.push(`progress_percentage = $${paramCounter}`);
      params.push(data.progress_percentage);
      paramCounter++;

      // Auto-update status based on progress
      if (data.progress_percentage >= 100) {
        updateFields.push(`status = 'completed'`);
      } else if (data.progress_percentage >= 75) {
        updateFields.push(`status = 'on_track'`);
      } else if (data.progress_percentage >= 50) {
        updateFields.push(`status = 'at_risk'`);
      } else {
        updateFields.push(`status = 'behind'`);
      }
    }

    if (data.status) {
      updateFields.push(`status = $${paramCounter}`);
      params.push(data.status);
      paramCounter++;
    }

    if (updateFields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    updateFields.push(`modified_at = NOW()`);
    params.push(goal_id, employee_id);

    const result = await this.db.query(
      `UPDATE performance_goals
       SET ${updateFields.join(', ')}
       WHERE goal_id = $${paramCounter} AND employee_id = $${paramCounter + 1}
       AND is_deleted = FALSE
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new AppError('Goal not found', 404);
    }

    return result.rows[0];
  }

  // ==================== PERFORMANCE REVIEWS ====================

  async createPerformanceReview(data: {
    employee_id: string;
    cycle_id: string;
    reviewer_id: string;
    review_type: string;
    organization_id: string;
  }): Promise<PerformanceReview> {
    const review_id = uuidv4();

    // Verify employee and cycle exist
    const employeeCheck = await this.db.query(
      `SELECT employee_id FROM employees WHERE employee_id = $1 AND organization_id = $2`,
      [data.employee_id, data.organization_id]
    );

    if (employeeCheck.rows.length === 0) {
      throw new AppError('Employee not found', 404);
    }

    const result = await this.db.query(
      `INSERT INTO performance_reviews (
        review_id, employee_id, cycle_id, reviewer_id, review_type, review_status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [review_id, data.employee_id, data.cycle_id, data.reviewer_id, data.review_type, 'draft']
    );

    return result.rows[0];
  }

  async submitPerformanceReview(
    review_id: string,
    reviewer_id: string,
    data: {
      overall_rating?: number;
      competency_rating?: number;
      goal_achievement_rating?: number;
      strengths?: string;
      areas_of_improvement?: string;
      achievements?: string;
      development_areas?: string;
      comments?: string;
    }
  ): Promise<PerformanceReview> {
    const result = await this.db.query(
      `UPDATE performance_reviews
       SET overall_rating = $1,
           competency_rating = $2,
           goal_achievement_rating = $3,
           strengths = $4,
           areas_of_improvement = $5,
           achievements = $6,
           development_areas = $7,
           comments = $8,
           review_status = 'submitted',
           submitted_at = NOW()
       WHERE review_id = $9 AND reviewer_id = $10
       RETURNING *`,
      [
        data.overall_rating,
        data.competency_rating,
        data.goal_achievement_rating,
        data.strengths,
        data.areas_of_improvement,
        data.achievements,
        data.development_areas,
        data.comments,
        review_id,
        reviewer_id,
      ]
    );

    if (result.rows.length === 0) {
      throw new AppError('Review not found or unauthorized', 404);
    }

    return result.rows[0];
  }

  async getEmployeeReviews(
    employee_id: string,
    organization_id: string,
    filters?: { cycle_id?: string; review_type?: string }
  ): Promise<PerformanceReview[]> {
    let query = `
      SELECT 
        pr.*,
        pc.cycle_name,
        pc.cycle_type,
        e.first_name || ' ' || e.last_name as employee_name,
        r.first_name || ' ' || r.last_name as reviewer_name
      FROM performance_reviews pr
      INNER JOIN performance_cycles pc ON pr.cycle_id = pc.cycle_id
      INNER JOIN employees e ON pr.employee_id = e.employee_id
      INNER JOIN employees r ON pr.reviewer_id = r.employee_id
      WHERE pr.employee_id = $1 
        AND e.organization_id = $2
        AND pr.is_deleted = FALSE
    `;
    const params: any[] = [employee_id, organization_id];
    let paramCounter = 3;

    if (filters?.cycle_id) {
      query += ` AND pr.cycle_id = $${paramCounter}`;
      params.push(filters.cycle_id);
      paramCounter++;
    }

    if (filters?.review_type) {
      query += ` AND pr.review_type = $${paramCounter}`;
      params.push(filters.review_type);
      paramCounter++;
    }

    query += ` ORDER BY pr.created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  // ==================== FEEDBACK (360) ====================

  async provideFeedback(data: {
    feedback_for_employee_id: string;
    feedback_from_employee_id?: string;
    feedback_type: string;
    feedback_category?: string;
    feedback_text: string;
    is_anonymous?: boolean;
    visibility?: string;
    organization_id: string;
  }): Promise<Feedback> {
    const feedback_id = uuidv4();

    // Verify employee exists
    const employeeCheck = await this.db.query(
      `SELECT employee_id FROM employees WHERE employee_id = $1 AND organization_id = $2`,
      [data.feedback_for_employee_id, data.organization_id]
    );

    if (employeeCheck.rows.length === 0) {
      throw new AppError('Employee not found', 404);
    }

    const result = await this.db.query(
      `INSERT INTO feedback (
        feedback_id, feedback_for_employee_id, feedback_from_employee_id,
        feedback_type, feedback_category, feedback_text, is_anonymous, visibility
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        feedback_id,
        data.feedback_for_employee_id,
        data.feedback_from_employee_id,
        data.feedback_type,
        data.feedback_category,
        data.feedback_text,
        data.is_anonymous ?? false,
        data.visibility ?? 'private',
      ]
    );

    return result.rows[0];
  }

  async getEmployeeFeedback(
    employee_id: string,
    organization_id: string,
    filters?: { feedback_type?: string; visibility?: string }
  ): Promise<Feedback[]> {
    let query = `
      SELECT 
        f.*,
        CASE 
          WHEN f.is_anonymous = TRUE THEN 'Anonymous'
          WHEN f.feedback_from_employee_id IS NOT NULL 
            THEN (SELECT first_name || ' ' || last_name FROM employees WHERE employee_id = f.feedback_from_employee_id)
          ELSE 'System'
        END as feedback_from_name
      FROM feedback f
      INNER JOIN employees e ON f.feedback_for_employee_id = e.employee_id
      WHERE f.feedback_for_employee_id = $1 
        AND e.organization_id = $2
        AND f.is_deleted = FALSE
    `;
    const params: any[] = [employee_id, organization_id];
    let paramCounter = 3;

    if (filters?.feedback_type) {
      query += ` AND f.feedback_type = $${paramCounter}`;
      params.push(filters.feedback_type);
      paramCounter++;
    }

    if (filters?.visibility) {
      query += ` AND f.visibility = $${paramCounter}`;
      params.push(filters.visibility);
      paramCounter++;
    }

    query += ` ORDER BY f.created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  // ==================== COMPETENCY MAPPING ====================

  async assessCompetency(data: {
    employee_id: string;
    competency_id: string;
    proficiency_level: string;
    assessed_by: string;
    target_level?: string;
    notes?: string;
    organization_id: string;
  }): Promise<CompetencyMapping> {
    const mapping_id = uuidv4();

    // Verify employee exists
    const employeeCheck = await this.db.query(
      `SELECT employee_id FROM employees WHERE employee_id = $1 AND organization_id = $2`,
      [data.employee_id, data.organization_id]
    );

    if (employeeCheck.rows.length === 0) {
      throw new AppError('Employee not found', 404);
    }

    const result = await this.db.query(
      `INSERT INTO employee_competencies (
        mapping_id, employee_id, competency_id, proficiency_level,
        assessment_date, assessed_by, target_level, notes
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
      RETURNING *`,
      [
        mapping_id,
        data.employee_id,
        data.competency_id,
        data.proficiency_level,
        data.assessed_by,
        data.target_level,
        data.notes,
      ]
    );

    return result.rows[0];
  }

  async getEmployeeCompetencies(
    employee_id: string,
    organization_id: string
  ): Promise<CompetencyMapping[]> {
    const result = await this.db.query(
      `SELECT 
        ec.*,
        c.competency_name,
        c.competency_category,
        c.description as competency_description,
        a.first_name || ' ' || a.last_name as assessor_name
      FROM employee_competencies ec
      INNER JOIN competencies c ON ec.competency_id = c.competency_id
      INNER JOIN employees e ON ec.employee_id = e.employee_id
      LEFT JOIN employees a ON ec.assessed_by = a.employee_id
      WHERE ec.employee_id = $1 
        AND e.organization_id = $2
        AND ec.is_deleted = FALSE
      ORDER BY ec.assessment_date DESC`,
      [employee_id, organization_id]
    );

    return result.rows;
  }

  // ==================== ANALYTICS ====================

  async getPerformanceAnalytics(
    organization_id: string,
    filters?: { cycle_id?: string; department_id?: string }
  ): Promise<any> {
    let query = `
      SELECT 
        COUNT(DISTINCT pr.review_id) as total_reviews,
        COUNT(DISTINCT pr.review_id) FILTER (WHERE pr.review_status = 'completed') as completed_reviews,
        AVG(pr.overall_rating) as avg_overall_rating,
        AVG(pr.competency_rating) as avg_competency_rating,
        AVG(pr.goal_achievement_rating) as avg_goal_achievement,
        COUNT(DISTINCT pg.goal_id) as total_goals,
        COUNT(DISTINCT pg.goal_id) FILTER (WHERE pg.status = 'completed') as completed_goals,
        AVG(pg.progress_percentage) as avg_goal_progress
      FROM performance_reviews pr
      FULL OUTER JOIN performance_goals pg ON pr.employee_id = pg.employee_id AND pr.cycle_id = pg.cycle_id
      INNER JOIN employees e ON COALESCE(pr.employee_id, pg.employee_id) = e.employee_id
      WHERE e.organization_id = $1
    `;
    const params: any[] = [organization_id];
    let paramCounter = 2;

    if (filters?.cycle_id) {
      query += ` AND COALESCE(pr.cycle_id, pg.cycle_id) = $${paramCounter}`;
      params.push(filters.cycle_id);
      paramCounter++;
    }

    if (filters?.department_id) {
      query += ` AND e.department_id = $${paramCounter}`;
      params.push(filters.department_id);
      paramCounter++;
    }

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  async getTopPerformers(
    organization_id: string,
    cycle_id: string,
    limit: number = 10
  ): Promise<any[]> {
    const result = await this.db.query(
      `SELECT 
        e.employee_id,
        e.employee_code,
        e.first_name || ' ' || e.last_name as employee_name,
        d.department_name,
        AVG(pr.overall_rating) as avg_rating,
        COUNT(pg.goal_id) FILTER (WHERE pg.status = 'completed') as goals_completed,
        AVG(pg.progress_percentage) as avg_goal_progress
      FROM employees e
      LEFT JOIN performance_reviews pr ON e.employee_id = pr.employee_id AND pr.cycle_id = $2
      LEFT JOIN performance_goals pg ON e.employee_id = pg.employee_id AND pg.cycle_id = $2
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE e.organization_id = $1 
        AND e.employment_status = 'active'
        AND e.is_deleted = FALSE
      GROUP BY e.employee_id, e.employee_code, e.first_name, e.last_name, d.department_name
      HAVING AVG(pr.overall_rating) IS NOT NULL
      ORDER BY avg_rating DESC, avg_goal_progress DESC
      LIMIT $3`,
      [organization_id, cycle_id, limit]
    );

    return result.rows;
  }
}
