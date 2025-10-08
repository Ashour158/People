import { query } from '../config/database';
import { getPaginationParams } from '../utils/pagination';

export class RecruitmentService {
  async createJob(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO job_postings
       (organization_id, job_title, job_code, department_id, location_id, employment_type,
        experience_level, job_description, required_skills, job_status, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, $11)
       RETURNING *`,
      [
        organizationId, data.job_title, data.job_code, data.department_id, data.location_id,
        data.employment_type, data.experience_level, data.job_description, data.required_skills,
        userId, userId
      ]
    );
    return result.rows[0];
  }

  async getJobs(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    
    let whereClause = 'WHERE jp.organization_id = $1 AND jp.is_deleted = FALSE';
    const queryParams: any[] = [organizationId];
    
    if (params.job_status) {
      queryParams.push(params.job_status);
      whereClause += ` AND jp.job_status = $${queryParams.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM job_postings jp ${whereClause}`,
      queryParams
    );

    queryParams.push(limit, offset);
    const result = await query(
      `SELECT jp.*, d.department_name, l.location_name
       FROM job_postings jp
       LEFT JOIN departments d ON jp.department_id = d.department_id
       LEFT JOIN locations l ON jp.location_id = l.location_id
       ${whereClause}
       ORDER BY jp.created_at DESC
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

  async getJobById(organizationId: string, jobId: string) {
    const result = await query(
      `SELECT jp.*, d.department_name, l.location_name
       FROM job_postings jp
       LEFT JOIN departments d ON jp.department_id = d.department_id
       LEFT JOIN locations l ON jp.location_id = l.location_id
       WHERE jp.organization_id = $1 AND jp.job_posting_id = $2 AND jp.is_deleted = FALSE`,
      [organizationId, jobId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Job posting not found');
    }
    
    return result.rows[0];
  }

  async updateJob(organizationId: string, jobId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE job_postings
       SET job_title = COALESCE($3, job_title),
           job_description = COALESCE($4, job_description),
           required_skills = COALESCE($5, required_skills),
           employment_type = COALESCE($6, employment_type),
           modified_by = $7,
           modified_at = NOW()
       WHERE organization_id = $1 AND job_posting_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [organizationId, jobId, data.job_title, data.job_description, data.required_skills, data.employment_type, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Job posting not found');
    }

    return result.rows[0];
  }

  async deleteJob(organizationId: string, jobId: string) {
    await query(
      `UPDATE job_postings SET is_deleted = TRUE WHERE organization_id = $1 AND job_posting_id = $2`,
      [organizationId, jobId]
    );
  }

  async publishJob(organizationId: string, jobId: string, userId: string) {
    const result = await query(
      `UPDATE job_postings
       SET job_status = 'published', published_date = NOW(), modified_by = $3
       WHERE organization_id = $1 AND job_posting_id = $2
       RETURNING *`,
      [organizationId, jobId, userId]
    );
    return result.rows[0];
  }

  async closeJob(organizationId: string, jobId: string, userId: string) {
    const result = await query(
      `UPDATE job_postings
       SET job_status = 'closed', closed_date = NOW(), modified_by = $3
       WHERE organization_id = $1 AND job_posting_id = $2
       RETURNING *`,
      [organizationId, jobId, userId]
    );
    return result.rows[0];
  }

  async createCandidate(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO candidates
       (organization_id, first_name, last_name, email, phone_number, resume_url, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [organizationId, data.first_name, data.last_name, data.email, data.phone_number, data.resume_url, userId, userId]
    );
    return result.rows[0];
  }

  async getCandidates(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    const countResult = await query(
      'SELECT COUNT(*) FROM candidates WHERE organization_id = $1 AND is_deleted = FALSE',
      [organizationId]
    );

    const result = await query(
      `SELECT * FROM candidates WHERE organization_id = $1 AND is_deleted = FALSE
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
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

  async getCandidateById(organizationId: string, candidateId: string) {
    const result = await query(
      'SELECT * FROM candidates WHERE organization_id = $1 AND candidate_id = $2 AND is_deleted = FALSE',
      [organizationId, candidateId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Candidate not found');
    }
    
    return result.rows[0];
  }

  async updateCandidate(organizationId: string, candidateId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE candidates
       SET first_name = COALESCE($3, first_name),
           last_name = COALESCE($4, last_name),
           email = COALESCE($5, email),
           phone_number = COALESCE($6, phone_number),
           modified_by = $7
       WHERE organization_id = $1 AND candidate_id = $2
       RETURNING *`,
      [organizationId, candidateId, data.first_name, data.last_name, data.email, data.phone_number, userId]
    );
    return result.rows[0];
  }

  async deleteCandidate(organizationId: string, candidateId: string) {
    await query(
      'UPDATE candidates SET is_deleted = TRUE WHERE organization_id = $1 AND candidate_id = $2',
      [organizationId, candidateId]
    );
  }

  async createApplication(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO job_applications
       (organization_id, job_posting_id, candidate_id, application_status, created_by, modified_by)
       VALUES ($1, $2, $3, 'applied', $4, $5)
       RETURNING *`,
      [organizationId, data.job_posting_id, data.candidate_id, userId, userId]
    );
    return result.rows[0];
  }

  async getApplications(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    let whereClause = 'WHERE ja.organization_id = $1 AND ja.is_deleted = FALSE';
    const queryParams: any[] = [organizationId];

    if (params.job_posting_id) {
      queryParams.push(params.job_posting_id);
      whereClause += ` AND ja.job_posting_id = $${queryParams.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM job_applications ja ${whereClause}`,
      queryParams
    );

    queryParams.push(limit, offset);
    const result = await query(
      `SELECT ja.*, c.first_name, c.last_name, c.email, jp.job_title
       FROM job_applications ja
       JOIN candidates c ON ja.candidate_id = c.candidate_id
       JOIN job_postings jp ON ja.job_posting_id = jp.job_posting_id
       ${whereClause}
       ORDER BY ja.created_at DESC
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

  async getApplicationById(organizationId: string, applicationId: string) {
    const result = await query(
      `SELECT ja.*, c.first_name, c.last_name, c.email, jp.job_title
       FROM job_applications ja
       JOIN candidates c ON ja.candidate_id = c.candidate_id
       JOIN job_postings jp ON ja.job_posting_id = jp.job_posting_id
       WHERE ja.organization_id = $1 AND ja.application_id = $2 AND ja.is_deleted = FALSE`,
      [organizationId, applicationId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }
    
    return result.rows[0];
  }

  async updateApplicationStatus(organizationId: string, applicationId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE job_applications
       SET application_status = $3, modified_by = $4
       WHERE organization_id = $1 AND application_id = $2
       RETURNING *`,
      [organizationId, applicationId, data.status, userId]
    );
    return result.rows[0];
  }

  async scheduleInterview(organizationId: string, userId: string, data: any) {
    const result = await query(
      `INSERT INTO interviews
       (organization_id, application_id, interview_type, scheduled_date, interview_status, created_by, modified_by)
       VALUES ($1, $2, $3, $4, 'scheduled', $5, $6)
       RETURNING *`,
      [organizationId, data.application_id, data.interview_type, data.scheduled_date, userId, userId]
    );
    return result.rows[0];
  }

  async getInterviews(organizationId: string, params: any) {
    const { limit, offset } = getPaginationParams(params);
    const countResult = await query(
      'SELECT COUNT(*) FROM interviews WHERE organization_id = $1 AND is_deleted = FALSE',
      [organizationId]
    );

    const result = await query(
      `SELECT i.*, ja.application_id, c.first_name, c.last_name, jp.job_title
       FROM interviews i
       JOIN job_applications ja ON i.application_id = ja.application_id
       JOIN candidates c ON ja.candidate_id = c.candidate_id
       JOIN job_postings jp ON ja.job_posting_id = jp.job_posting_id
       WHERE i.organization_id = $1 AND i.is_deleted = FALSE
       ORDER BY i.scheduled_date DESC LIMIT $2 OFFSET $3`,
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

  async getInterviewById(organizationId: string, interviewId: string) {
    const result = await query(
      `SELECT i.*, ja.application_id, c.first_name, c.last_name, jp.job_title
       FROM interviews i
       JOIN job_applications ja ON i.application_id = ja.application_id
       JOIN candidates c ON ja.candidate_id = c.candidate_id
       JOIN job_postings jp ON ja.job_posting_id = jp.job_posting_id
       WHERE i.organization_id = $1 AND i.interview_id = $2 AND i.is_deleted = FALSE`,
      [organizationId, interviewId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Interview not found');
    }
    
    return result.rows[0];
  }

  async updateInterview(organizationId: string, interviewId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE interviews
       SET scheduled_date = COALESCE($3, scheduled_date),
           interview_status = COALESCE($4, interview_status),
           modified_by = $5
       WHERE organization_id = $1 AND interview_id = $2
       RETURNING *`,
      [organizationId, interviewId, data.scheduled_date, data.interview_status, userId]
    );
    return result.rows[0];
  }

  async addInterviewFeedback(organizationId: string, interviewId: string, userId: string, data: any) {
    const result = await query(
      `UPDATE interviews
       SET interview_feedback = $3, overall_rating = $4, modified_by = $5
       WHERE organization_id = $1 AND interview_id = $2
       RETURNING *`,
      [organizationId, interviewId, data.feedback, data.rating, userId]
    );
    return result.rows[0];
  }
}
