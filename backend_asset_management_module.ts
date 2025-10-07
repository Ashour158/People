// =====================================================
// ASSET MANAGEMENT - BACKEND IMPLEMENTATION
// =====================================================

import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const router = Router();

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const assetCategorySchema = Joi.object({
  category_name: Joi.string().required().max(100),
  category_code: Joi.string().required().max(50),
  parent_category_id: Joi.string().uuid().allow(null),
  description: Joi.string().allow('')
});

const assetSchema = Joi.object({
  asset_name: Joi.string().required().max(200),
  asset_code: Joi.string().required().max(50),
  category_id: Joi.string().uuid(),
  asset_type: Joi.string().valid('laptop', 'desktop', 'mobile', 'furniture', 'vehicle', 'other'),
  brand: Joi.string().max(100),
  model: Joi.string().max(100),
  serial_number: Joi.string().max(100),
  purchase_date: Joi.date(),
  purchase_price: Joi.number().precision(2),
  vendor_name: Joi.string().max(200),
  invoice_number: Joi.string().max(100),
  warranty_start_date: Joi.date(),
  warranty_end_date: Joi.date(),
  location_id: Joi.string().uuid(),
  condition: Joi.string().valid('excellent', 'good', 'fair', 'poor', 'damaged'),
  description: Joi.string().allow(''),
  notes: Joi.string().allow('')
});

const assetAssignmentSchema = Joi.object({
  asset_id: Joi.string().uuid().required(),
  employee_id: Joi.string().uuid().required(),
  assigned_date: Joi.date().required(),
  expected_return_date: Joi.date(),
  purpose: Joi.string().allow(''),
  condition_at_assignment: Joi.string().valid('excellent', 'good', 'fair', 'poor', 'damaged'),
  notes_at_assignment: Joi.string().allow('')
});

const assetMaintenanceSchema = Joi.object({
  asset_id: Joi.string().uuid().required(),
  maintenance_type: Joi.string().required().valid('preventive', 'corrective', 'emergency'),
  scheduled_date: Joi.date().required(),
  description: Joi.string().required(),
  cost: Joi.number().precision(2).default(0),
  vendor_name: Joi.string().max(200),
  vendor_contact: Joi.string().max(100),
  performed_by: Joi.string().max(200),
  notes: Joi.string().allow('')
});

const assetRequestSchema = Joi.object({
  asset_type: Joi.string().required().max(50),
  category_id: Joi.string().uuid(),
  request_reason: Joi.string().required(),
  urgency: Joi.string().valid('low', 'normal', 'high', 'critical').default('normal'),
  required_by_date: Joi.date(),
  specifications: Joi.object().allow(null)
});

// =====================================================
// ASSET CATEGORIES ROUTES
// =====================================================

// Get asset categories
router.get('/assets/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;

    const result = await req.db.query(`
      SELECT ac.*, 
        pac.category_name as parent_category_name,
        COALESCE(
          (SELECT COUNT(*) FROM assets WHERE category_id = ac.category_id AND is_deleted = FALSE),
          0
        ) as assets_count
      FROM asset_categories ac
      LEFT JOIN asset_categories pac ON ac.parent_category_id = pac.category_id
      WHERE ac.organization_id = $1 AND ac.is_deleted = FALSE
      ORDER BY ac.category_name
    `, [organization_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create asset category
router.post('/assets/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = assetCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO asset_categories (
        organization_id, category_name, category_code, parent_category_id, description, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [organization_id, value.category_name, value.category_code, value.parent_category_id, value.description, user_id]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// ASSETS ROUTES
// =====================================================

// Get all assets
router.get('/assets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id, company_id } = req.user;
    const { status, asset_type, category_id, location_id, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT a.*, 
        ac.category_name,
        l.location_name,
        CASE 
          WHEN aa.assignment_id IS NOT NULL THEN 
            json_build_object(
              'employee_id', e.employee_id,
              'employee_name', e.first_name || ' ' || e.last_name,
              'assigned_date', aa.assigned_date
            )
          ELSE NULL
        END as current_assignment
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.category_id
      LEFT JOIN locations l ON a.location_id = l.location_id
      LEFT JOIN asset_assignments aa ON a.asset_id = aa.asset_id AND aa.status = 'active' AND aa.is_deleted = FALSE
      LEFT JOIN employees e ON aa.employee_id = e.employee_id
      WHERE a.organization_id = $1 AND a.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (company_id) {
      query += ` AND (a.company_id = $${params.length + 1} OR a.company_id IS NULL)`;
      params.push(company_id);
    }

    if (status) {
      query += ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }

    if (asset_type) {
      query += ` AND a.asset_type = $${params.length + 1}`;
      params.push(asset_type);
    }

    if (category_id) {
      query += ` AND a.category_id = $${params.length + 1}`;
      params.push(category_id);
    }

    if (location_id) {
      query += ` AND a.location_id = $${params.length + 1}`;
      params.push(location_id);
    }

    query += ` ORDER BY a.created_at DESC`;

    const offset = (Number(page) - 1) * Number(limit);
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await req.db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM assets WHERE organization_id = $1 AND is_deleted = FALSE`;
    const countParams: any[] = [organization_id];
    const countResult = await req.db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get asset by ID
router.get('/assets/:asset_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { asset_id } = req.params;
    const { organization_id } = req.user;

    const assetResult = await req.db.query(`
      SELECT a.*, 
        ac.category_name,
        l.location_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.category_id
      LEFT JOIN locations l ON a.location_id = l.location_id
      WHERE a.asset_id = $1 AND a.organization_id = $2 AND a.is_deleted = FALSE
    `, [asset_id, organization_id]);

    if (assetResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    // Get assignment history
    const assignmentsResult = await req.db.query(`
      SELECT aa.*, 
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_code
      FROM asset_assignments aa
      JOIN employees e ON aa.employee_id = e.employee_id
      WHERE aa.asset_id = $1 AND aa.is_deleted = FALSE
      ORDER BY aa.assigned_date DESC
    `, [asset_id]);

    // Get maintenance history
    const maintenanceResult = await req.db.query(`
      SELECT * FROM asset_maintenance
      WHERE asset_id = $1 AND is_deleted = FALSE
      ORDER BY scheduled_date DESC
    `, [asset_id]);

    res.json({
      success: true,
      data: {
        ...assetResult.rows[0],
        assignment_history: assignmentsResult.rows,
        maintenance_history: maintenanceResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create asset
router.post('/assets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = assetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, company_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO assets (
        organization_id, company_id, asset_name, asset_code, category_id, asset_type,
        brand, model, serial_number, purchase_date, purchase_price, vendor_name,
        invoice_number, warranty_start_date, warranty_end_date, location_id,
        condition, description, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      organization_id, company_id, value.asset_name, value.asset_code, value.category_id,
      value.asset_type, value.brand, value.model, value.serial_number, value.purchase_date,
      value.purchase_price, value.vendor_name, value.invoice_number, value.warranty_start_date,
      value.warranty_end_date, value.location_id, value.condition || 'good',
      value.description, value.notes, user_id
    ]);

    // Log audit
    await req.db.query(`
      INSERT INTO asset_audit_log (asset_id, action, new_status, created_by)
      VALUES ($1, 'created', 'available', $2)
    `, [result.rows[0].asset_id, user_id]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update asset
router.put('/assets/:asset_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { asset_id } = req.params;
    const { error, value } = assetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      UPDATE assets
      SET asset_name = $1, category_id = $2, asset_type = $3, brand = $4,
          model = $5, serial_number = $6, purchase_date = $7, purchase_price = $8,
          vendor_name = $9, invoice_number = $10, warranty_start_date = $11,
          warranty_end_date = $12, location_id = $13, condition = $14,
          description = $15, notes = $16, modified_by = $17, modified_at = CURRENT_TIMESTAMP
      WHERE asset_id = $18 AND organization_id = $19 AND is_deleted = FALSE
      RETURNING *
    `, [
      value.asset_name, value.category_id, value.asset_type, value.brand,
      value.model, value.serial_number, value.purchase_date, value.purchase_price,
      value.vendor_name, value.invoice_number, value.warranty_start_date,
      value.warranty_end_date, value.location_id, value.condition,
      value.description, value.notes, user_id, asset_id, organization_id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
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
// ASSET ASSIGNMENTS ROUTES
// =====================================================

// Assign asset to employee
router.post('/assets/assignments', async (req: Request, res: Response, next: NextFunction) => {
  const client = await req.db.connect();
  
  try {
    const { error, value } = assetAssignmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    await client.query('BEGIN');

    // Check if asset is available
    const assetCheck = await client.query(`
      SELECT * FROM assets WHERE asset_id = $1 AND organization_id = $2 AND status = 'available' AND is_deleted = FALSE
    `, [value.asset_id, organization_id]);

    if (assetCheck.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Asset is not available for assignment' });
    }

    // Create assignment
    const assignmentResult = await client.query(`
      INSERT INTO asset_assignments (
        asset_id, employee_id, assigned_date, expected_return_date, purpose,
        condition_at_assignment, notes_at_assignment, assigned_by, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      value.asset_id, value.employee_id, value.assigned_date, value.expected_return_date,
      value.purpose, value.condition_at_assignment, value.notes_at_assignment,
      user_id, user_id
    ]);

    // Update asset status
    await client.query(`
      UPDATE assets SET status = 'assigned', modified_at = CURRENT_TIMESTAMP
      WHERE asset_id = $1
    `, [value.asset_id]);

    // Log audit
    await client.query(`
      INSERT INTO asset_audit_log (
        asset_id, action, old_status, new_status, new_assigned_to, created_by
      ) VALUES ($1, 'assigned', 'available', 'assigned', $2, $3)
    `, [value.asset_id, value.employee_id, user_id]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: assignmentResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Return asset
router.post('/assets/assignments/:assignment_id/return', async (req: Request, res: Response, next: NextFunction) => {
  const client = await req.db.connect();
  
  try {
    const { assignment_id } = req.params;
    const { condition_at_return, notes_at_return } = req.body;
    const { organization_id, user_id } = req.user;

    await client.query('BEGIN');

    // Get assignment details
    const assignmentCheck = await client.query(`
      SELECT aa.*, a.asset_id FROM asset_assignments aa
      JOIN assets a ON aa.asset_id = a.asset_id
      WHERE aa.assignment_id = $1 AND a.organization_id = $2 AND aa.status = 'active'
    `, [assignment_id, organization_id]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Active assignment not found' });
    }

    const assignment = assignmentCheck.rows[0];

    // Update assignment
    const result = await client.query(`
      UPDATE asset_assignments
      SET status = 'returned',
          actual_return_date = CURRENT_DATE,
          condition_at_return = $1,
          notes_at_return = $2,
          returned_to = $3,
          modified_at = CURRENT_TIMESTAMP
      WHERE assignment_id = $4
      RETURNING *
    `, [condition_at_return, notes_at_return, user_id, assignment_id]);

    // Update asset status
    await client.query(`
      UPDATE assets 
      SET status = 'available', condition = $1, modified_at = CURRENT_TIMESTAMP
      WHERE asset_id = $2
    `, [condition_at_return || 'good', assignment.asset_id]);

    // Log audit
    await client.query(`
      INSERT INTO asset_audit_log (
        asset_id, action, old_status, new_status, old_assigned_to, created_by
      ) VALUES ($1, 'returned', 'assigned', 'available', $2, $3)
    `, [assignment.asset_id, assignment.employee_id, user_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// =====================================================
// ASSET MAINTENANCE ROUTES
// =====================================================

// Get maintenance records
router.get('/assets/maintenance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { asset_id, status } = req.query;

    let query = `
      SELECT am.*, 
        a.asset_code, a.asset_name, a.asset_type
      FROM asset_maintenance am
      JOIN assets a ON am.asset_id = a.asset_id
      WHERE a.organization_id = $1 AND am.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (asset_id) {
      query += ` AND am.asset_id = $${params.length + 1}`;
      params.push(asset_id);
    }

    if (status) {
      query += ` AND am.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY am.scheduled_date DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Schedule maintenance
router.post('/assets/maintenance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = assetMaintenanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO asset_maintenance (
        asset_id, maintenance_type, scheduled_date, description, cost,
        vendor_name, vendor_contact, performed_by, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      value.asset_id, value.maintenance_type, value.scheduled_date, value.description,
      value.cost, value.vendor_name, value.vendor_contact, value.performed_by,
      value.notes, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Update maintenance status
router.patch('/assets/maintenance/:maintenance_id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maintenance_id } = req.params;
    const { status, completed_date, notes } = req.body;
    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      UPDATE asset_maintenance
      SET status = $1,
          completed_date = $2,
          notes = COALESCE($3, notes),
          modified_by = $4,
          modified_at = CURRENT_TIMESTAMP
      WHERE maintenance_id = $5
      RETURNING *
    `, [status, completed_date, notes, user_id, maintenance_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
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
// ASSET REQUESTS ROUTES
// =====================================================

// Get asset requests
router.get('/assets/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { employee_id, status } = req.query;

    let query = `
      SELECT ar.*, 
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_code,
        ac.category_name
      FROM asset_requests ar
      JOIN employees e ON ar.employee_id = e.employee_id
      LEFT JOIN asset_categories ac ON ar.category_id = ac.category_id
      WHERE ar.organization_id = $1 AND ar.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (employee_id) {
      query += ` AND ar.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }

    if (status) {
      query += ` AND ar.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY ar.requested_at DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create asset request
router.post('/assets/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = assetRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO asset_requests (
        organization_id, employee_id, asset_type, category_id, request_reason,
        urgency, required_by_date, specifications, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      organization_id, user_id, value.asset_type, value.category_id,
      value.request_reason, value.urgency, value.required_by_date,
      JSON.stringify(value.specifications), user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Approve/Reject asset request
router.post('/assets/requests/:request_id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { request_id } = req.params;
    const { action, assigned_asset_id, rejection_reason } = req.body;
    const { organization_id, user_id } = req.user;

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await req.db.query(`
      UPDATE asset_requests
      SET status = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          approved_by = $3,
          approved_at = CURRENT_TIMESTAMP,
          assigned_asset_id = $4,
          rejection_reason = $5,
          modified_at = CURRENT_TIMESTAMP
      WHERE request_id = $6 AND organization_id = $7 AND is_deleted = FALSE
      RETURNING *
    `, [newStatus, user_id, user_id, assigned_asset_id, rejection_reason, request_id, organization_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Asset request not found' });
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
// ANALYTICS & REPORTS
// =====================================================

// Get asset analytics
router.get('/assets/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;

    // Total assets by status
    const statusResult = await req.db.query(`
      SELECT status, COUNT(*) as count
      FROM assets
      WHERE organization_id = $1 AND is_deleted = FALSE
      GROUP BY status
    `, [organization_id]);

    // Total assets by type
    const typeResult = await req.db.query(`
      SELECT asset_type, COUNT(*) as count
      FROM assets
      WHERE organization_id = $1 AND is_deleted = FALSE
      GROUP BY asset_type
    `, [organization_id]);

    // Assets needing maintenance soon
    const maintenanceResult = await req.db.query(`
      SELECT COUNT(*) as count
      FROM asset_maintenance am
      JOIN assets a ON am.asset_id = a.asset_id
      WHERE a.organization_id = $1 
        AND am.status = 'scheduled'
        AND am.scheduled_date <= CURRENT_DATE + INTERVAL '7 days'
        AND am.is_deleted = FALSE
    `, [organization_id]);

    // Assets with expired warranty
    const warrantyResult = await req.db.query(`
      SELECT COUNT(*) as count
      FROM assets
      WHERE organization_id = $1 
        AND warranty_end_date < CURRENT_DATE
        AND is_deleted = FALSE
    `, [organization_id]);

    res.json({
      success: true,
      data: {
        by_status: statusResult.rows,
        by_type: typeResult.rows,
        maintenance_due: maintenanceResult.rows[0].count,
        warranty_expired: warrantyResult.rows[0].count
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
