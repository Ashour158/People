import { query } from '../config/database';
import { getPaginationParams } from '../utils/pagination';

export class PerformanceService {
  async createCycle(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO performance_cycles 
       (organization_id, cycle_name, cycle_code, cycle_type, start_date, end_date,
        review_start_date, review_end_date, description, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        organizationId,
        data.cycle_name,
        data.cycle_code,
        data.cycle_type,
        data.start_date,
        data.end_date,
        data.review_start_date,
        data.review_end_date,
        data.description,
        userId,
        userId
      ]
    );
    return result.rows[0];
  }

  async getCycles(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    
    const countResult = await query(
      'SELECT COUNT(*) FROM performance_cycles WHERE organization_id = $1 AND is_deleted = FALSE',
      [organizationId]
    );

    const result = await query(
      `SELECT * FROM performance_cycles
       WHERE organization_id = $1 AND is_deleted = FALSE
       ORDER BY start_date DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    );

    return {
      data: result.rows,
      meta: {
        page: params.page || 1,
        perPage: limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  async getCycleById(organizationId: string, cycleId: string) {
    const result = await query(
      'SELECT * FROM performance_cycles WHERE organization_id = $1 AND cycle_id = $2 AND is_deleted = FALSE',
      [organizationId, cycleId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Performance cycle not found');
    }
    
    return result.rows[0];
  }

  async updateCycle(organizationId: string, cycleId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE performance_cycles
       SET cycle_name = COALESCE($3, cycle_name),
           cycle_type = COALESCE($4, cycle_type),
           start_date = COALESCE($5, start_date),
           end_date = COALESCE($6, end_date),
           review_start_date = COALESCE($7, review_start_date),
           review_end_date = COALESCE($8, review_end_date),
           description = COALESCE($9, description),
           modified_by = $10,
           modified_at = NOW()
       WHERE organization_id = $1 AND cycle_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [
        organizationId,
        cycleId,
        data.cycle_name,
        data.cycle_type,
        data.start_date,
        data.end_date,
        data.review_start_date,
        data.review_end_date,
        data.description,
        userId
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Performance cycle not found');
    }

    return result.rows[0];
  }

  async deleteCycle(organizationId: string, cycleId: string) {
    const result = await query(
      `UPDATE performance_cycles
       SET is_deleted = TRUE, modified_at = NOW()
       WHERE organization_id = $1 AND cycle_id = $2
       RETURNING cycle_id`,
      [organizationId, cycleId]
    );

    if (result.rows.length === 0) {
      throw new Error('Performance cycle not found');
    }
  }

  async createGoal(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO performance_goals
       (organization_id, employee_id, cycle_id, goal_title, goal_description,
        goal_category, goal_type, start_date, end_date, target_value, weight_percentage,
        created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        organizationId,
        data.employee_id,
        data.cycle_id,
        data.goal_title,
        data.goal_description,
        data.goal_category,
        data.goal_type,
        data.start_date,
        data.end_date,
        data.target_value,
        data.weight_percentage,
        userId,
        userId
      ]
    );
    return result.rows[0];
  }

  async getGoals(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    
    let whereClause = 'WHERE g.organization_id = $1 AND g.is_deleted = FALSE';
    const queryParams: any[] = [organizationId];
    
    if (params.employee_id) {
      queryParams.push(params.employee_id);
      whereClause += ` AND g.employee_id = $${queryParams.length}`;
    }
    
    if (params.cycle_id) {
      queryParams.push(params.cycle_id);
      whereClause += ` AND g.cycle_id = $${queryParams.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM performance_goals g ${whereClause}`,
      queryParams
    );

    queryParams.push(limit, offset);
    const result = await query(
      `SELECT g.*, e.first_name, e.last_name, e.employee_code,
              pc.cycle_name
       FROM performance_goals g
       JOIN employees e ON g.employee_id = e.employee_id
       LEFT JOIN performance_cycles pc ON g.cycle_id = pc.cycle_id
       ${whereClause}
       ORDER BY g.created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: result.rows,
      meta: {
        page: params.page || 1,
        perPage: limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  async getGoalById(organizationId: string, goalId: string) {
    const result = await query(
      `SELECT g.*, e.first_name, e.last_name, e.employee_code,
              pc.cycle_name
       FROM performance_goals g
       JOIN employees e ON g.employee_id = e.employee_id
       LEFT JOIN performance_cycles pc ON g.cycle_id = pc.cycle_id
       WHERE g.organization_id = $1 AND g.goal_id = $2 AND g.is_deleted = FALSE`,
      [organizationId, goalId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Goal not found');
    }
    
    return result.rows[0];
  }

  async updateGoal(organizationId: string, goalId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE performance_goals
       SET goal_title = COALESCE($3, goal_title),
           goal_description = COALESCE($4, goal_description),
           goal_category = COALESCE($5, goal_category),
           goal_type = COALESCE($6, goal_type),
           start_date = COALESCE($7, start_date),
           end_date = COALESCE($8, end_date),
           target_value = COALESCE($9, target_value),
           weight_percentage = COALESCE($10, weight_percentage),
           modified_by = $11,
           modified_at = NOW()
       WHERE organization_id = $1 AND goal_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [
        organizationId,
        goalId,
        data.goal_title,
        data.goal_description,
        data.goal_category,
        data.goal_type,
        data.start_date,
        data.end_date,
        data.target_value,
        data.weight_percentage,
        userId
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Goal not found');
    }

    return result.rows[0];
  }

  async deleteGoal(organizationId: string, goalId: string) {
    const result = await query(
      `UPDATE performance_goals
       SET is_deleted = TRUE, modified_at = NOW()
       WHERE organization_id = $1 AND goal_id = $2
       RETURNING goal_id`,
      [organizationId, goalId]
    );

    if (result.rows.length === 0) {
      throw new Error('Goal not found');
    }
  }

  async updateGoalProgress(organizationId: string, goalId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE performance_goals
       SET progress_percentage = $3,
           actual_value = $4,
           progress_notes = $5,
           modified_by = $6,
           modified_at = NOW()
       WHERE organization_id = $1 AND goal_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [organizationId, goalId, data.progress_percentage, data.actual_value, data.progress_notes, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Goal not found');
    }

    return result.rows[0];
  }

  async createReview(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO performance_reviews
       (organization_id, employee_id, reviewer_id, cycle_id, review_type,
        review_period_start, review_period_end, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        organizationId,
        data.employee_id,
        data.reviewer_id,
        data.cycle_id,
        data.review_type,
        data.review_period_start,
        data.review_period_end,
        userId,
        userId
      ]
    );
    return result.rows[0];
  }

  async getReviews(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    
    let whereClause = 'WHERE pr.organization_id = $1 AND pr.is_deleted = FALSE';
    const queryParams: any[] = [organizationId];
    
    if (params.employee_id) {
      queryParams.push(params.employee_id);
      whereClause += ` AND pr.employee_id = $${queryParams.length}`;
    }
    
    if (params.cycle_id) {
      queryParams.push(params.cycle_id);
      whereClause += ` AND pr.cycle_id = $${queryParams.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM performance_reviews pr ${whereClause}`,
      queryParams
    );

    queryParams.push(limit, offset);
    const result = await query(
      `SELECT pr.*, 
              e.first_name as employee_first_name, e.last_name as employee_last_name, e.employee_code,
              r.first_name as reviewer_first_name, r.last_name as reviewer_last_name,
              pc.cycle_name
       FROM performance_reviews pr
       JOIN employees e ON pr.employee_id = e.employee_id
       LEFT JOIN employees r ON pr.reviewer_id = r.employee_id
       LEFT JOIN performance_cycles pc ON pr.cycle_id = pc.cycle_id
       ${whereClause}
       ORDER BY pr.created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: result.rows,
      meta: {
        page: params.page || 1,
        perPage: limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  async getReviewById(organizationId: string, reviewId: string) {
    const result = await query(
      `SELECT pr.*, 
              e.first_name as employee_first_name, e.last_name as employee_last_name, e.employee_code,
              r.first_name as reviewer_first_name, r.last_name as reviewer_last_name,
              pc.cycle_name
       FROM performance_reviews pr
       JOIN employees e ON pr.employee_id = e.employee_id
       LEFT JOIN employees r ON pr.reviewer_id = r.employee_id
       LEFT JOIN performance_cycles pc ON pr.cycle_id = pc.cycle_id
       WHERE pr.organization_id = $1 AND pr.review_id = $2 AND pr.is_deleted = FALSE`,
      [organizationId, reviewId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Review not found');
    }
    
    return result.rows[0];
  }

  async updateReview(organizationId: string, reviewId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE performance_reviews
       SET overall_rating = COALESCE($3, overall_rating),
           strengths = COALESCE($4, strengths),
           areas_of_improvement = COALESCE($5, areas_of_improvement),
           reviewer_comments = COALESCE($6, reviewer_comments),
           employee_comments = COALESCE($7, employee_comments),
           modified_by = $8,
           modified_at = NOW()
       WHERE organization_id = $1 AND review_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [
        organizationId,
        reviewId,
        data.overall_rating,
        data.strengths,
        data.areas_of_improvement,
        data.reviewer_comments,
        data.employee_comments,
        userId
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Review not found');
    }

    return result.rows[0];
  }

  async submitReview(organizationId: string, reviewId: string, userId: string) {
    const result = await query(
      `UPDATE performance_reviews
       SET review_status = 'completed',
           submitted_at = NOW(),
           modified_by = $3,
           modified_at = NOW()
       WHERE organization_id = $1 AND review_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [organizationId, reviewId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Review not found');
    }

    return result.rows[0];
  }

  async createFeedback(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO performance_feedback
       (organization_id, employee_id, feedback_from_employee_id, feedback_type,
        feedback_category, feedback_text, is_anonymous, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        organizationId,
        data.employee_id,
        data.feedback_from_employee_id,
        data.feedback_type,
        data.feedback_category,
        data.feedback_text,
        data.is_anonymous || false,
        userId,
        userId
      ]
    );
    return result.rows[0];
  }

  async getFeedback(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    
    let whereClause = 'WHERE pf.organization_id = $1 AND pf.is_deleted = FALSE';
    const queryParams: any[] = [organizationId];
    
    if (params.employee_id) {
      queryParams.push(params.employee_id);
      whereClause += ` AND pf.employee_id = $${queryParams.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM performance_feedback pf ${whereClause}`,
      queryParams
    );

    queryParams.push(limit, offset);
    const result = await query(
      `SELECT pf.*, 
              e.first_name as employee_first_name, e.last_name as employee_last_name,
              ef.first_name as feedback_from_first_name, ef.last_name as feedback_from_last_name
       FROM performance_feedback pf
       JOIN employees e ON pf.employee_id = e.employee_id
       LEFT JOIN employees ef ON pf.feedback_from_employee_id = ef.employee_id
       ${whereClause}
       ORDER BY pf.created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: result.rows,
      meta: {
        page: params.page || 1,
        perPage: limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }
}
