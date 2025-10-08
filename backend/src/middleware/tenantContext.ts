// =====================================================
// Tenant Context Middleware
// Extracts and sets organization context for multi-tenancy
// =====================================================

import { Request, Response, NextFunction } from 'express';
import { Pool, PoolClient } from 'pg';

// =====================================================
// EXTEND EXPRESS REQUEST TYPE
// =====================================================

declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      userId?: string;
      user?: {
        user_id: string;
        organization_id: string;
        email: string;
        roles: string[];
      };
    }
  }
}

// =====================================================
// TENANT CONTEXT MIDDLEWARE
// =====================================================

/**
 * Middleware to extract organization context from authenticated user
 * Should be placed after authentication middleware
 */
export function tenantContext() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract organization ID from authenticated user
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        res.status(403).json({
          success: false,
          error: 'Organization context not found',
          code: 'ORG_CONTEXT_MISSING',
        });
        return;
      }

      // Set organization ID in request
      req.organizationId = organizationId;
      
      next();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Tenant context middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to establish organization context',
      });
    }
  };
}

// =====================================================
// SET ORGANIZATION CONTEXT IN DATABASE SESSION
// =====================================================

/**
 * Sets the organization context in the database session for RLS
 * When RLS is enabled, this must be called for each transaction
 */
export async function setOrganizationContext(
  client: PoolClient,
  organizationId: string
): Promise<void> {
  try {
    await client.query(
      'SET LOCAL app.current_organization_id = $1',
      [organizationId]
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to set organization context:', error);
    throw new Error('Failed to set organization context in database');
  }
}

/**
 * Helper to execute a query with organization context
 * Automatically sets the organization context for the query
 */
export async function withOrgContext<T>(
  pool: Pool,
  organizationId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await setOrganizationContext(client, organizationId);
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// =====================================================
// ENSURE ORGANIZATION SCOPE HELPER
// =====================================================

/**
 * Helper to ensure organization scope in queries
 * Adds organization_id filter to WHERE clause
 */
export function ensureOrgScope(
  query: string,
  organizationId: string,
  paramIndex = 1
): { query: string; params: any[] } {
  const orgParam = `$${paramIndex}`;
  
  if (query.toUpperCase().includes('WHERE')) {
    // Add to existing WHERE clause
    const modifiedQuery = query.replace(
      /WHERE/i,
      `WHERE organization_id = ${orgParam} AND`
    );
    return { query: modifiedQuery, params: [organizationId] };
  } else {
    // Add new WHERE clause before ORDER BY, LIMIT, etc.
    const insertionPoint = query.search(/ORDER BY|LIMIT|OFFSET|GROUP BY|HAVING/i);
    
    if (insertionPoint !== -1) {
      const modifiedQuery =
        query.substring(0, insertionPoint) +
        `WHERE organization_id = ${orgParam} ` +
        query.substring(insertionPoint);
      return { query: modifiedQuery, params: [organizationId] };
    } else {
      // No special clauses, append at end
      return {
        query: `${query} WHERE organization_id = ${orgParam}`,
        params: [organizationId],
      };
    }
  }
}

/**
 * Validates that an entity belongs to the specified organization
 */
export async function validateOrgOwnership(
  pool: Pool,
  tableName: string,
  entityId: string,
  organizationId: string,
  idColumnName = 'id'
): Promise<boolean> {
  const query = `
    SELECT 1 FROM ${tableName}
    WHERE ${idColumnName} = $1 AND organization_id = $2 AND is_deleted = FALSE
  `;
  
  const result = await pool.query(query, [entityId, organizationId]);
  return result.rowCount !== null && result.rowCount > 0;
}

// =====================================================
// MOCK AUTHENTICATION MIDDLEWARE (FOR TESTING)
// =====================================================

/**
 * Mock authentication middleware for testing
 * In production, replace with actual JWT authentication
 */
export function mockAuthMiddleware(organizationId: string, userId: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.user = {
      user_id: userId,
      organization_id: organizationId,
      email: 'test@example.com',
      roles: ['admin'],
    };
    next();
  };
}
