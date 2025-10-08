import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ApiKeyService } from '../services/apiKey.service';

export class ApiKeyController {
  private apiKeyService: ApiKeyService;

  constructor(db: Pool) {
    this.apiKeyService = new ApiKeyService(db);
  }

  /**
   * Generate new API key
   */
  generateApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        key_name,
        permissions,
        scopes,
        rate_limit_per_hour,
        ip_whitelist,
        expires_at
      } = req.body;
      const organizationId = (req as any).user.organization_id;
      const userId = (req as any).user.user_id;

      const { apiKey, plainKey } = await this.apiKeyService.generateApiKey({
        organization_id: organizationId,
        key_name,
        permissions,
        scopes,
        rate_limit_per_hour,
        ip_whitelist,
        expires_at: expires_at ? new Date(expires_at) : undefined,
        created_by: userId
      });

      res.status(201).json({
        success: true,
        message: 'API key generated successfully',
        data: {
          ...apiKey,
          key: plainKey // Only shown once
        },
        warning: 'Please save this API key securely. It will not be shown again.'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all API keys
   */
  getApiKeys = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user.organization_id;

      const apiKeys = await this.apiKeyService.getApiKeys(organizationId);

      res.json({
        success: true,
        data: apiKeys,
        count: apiKeys.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get single API key
   */
  getApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { keyId } = req.params;
      const organizationId = (req as any).user.organization_id;

      const apiKey = await this.apiKeyService.getApiKey(keyId, organizationId);

      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: 'API key not found'
        });
        return;
      }

      res.json({
        success: true,
        data: apiKey
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update API key
   */
  updateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { keyId } = req.params;
      const {
        key_name,
        permissions,
        scopes,
        rate_limit_per_hour,
        ip_whitelist,
        is_active
      } = req.body;
      const organizationId = (req as any).user.organization_id;

      const apiKey = await this.apiKeyService.updateApiKey(keyId || '', organizationId, {
        key_name,
        permissions,
        scopes,
        rate_limit_per_hour,
        ip_whitelist,
        is_active
      });

      res.json({
        success: true,
        message: 'API key updated successfully',
        data: apiKey
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Revoke API key
   */
  revokeApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { keyId } = req.params;
      const { reason } = req.body;
      const organizationId = (req as any).user.organization_id;
      const userId = (req as any).user.user_id;

      await this.apiKeyService.revokeApiKey(keyId || '', organizationId, userId, reason);

      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get API key usage statistics
   */
  getUsageStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { keyId } = req.params;
      const { days } = req.query;
      const organizationId = (req as any).user.organization_id;

      // Verify key belongs to organization
      const apiKey = await this.apiKeyService.getApiKey(keyId || '', organizationId);
      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: 'API key not found'
        });
        return;
      }

      const stats = await this.apiKeyService.getUsageStats(
        keyId || '',
        days ? parseInt(days as string) : undefined
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };
}
