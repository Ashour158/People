import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { OAuthService } from '../services/oauth.service';
import jwt from 'jsonwebtoken';

export class OAuthController {
  private oauthService: OAuthService;

  constructor(db: Pool) {
    this.oauthService = new OAuthService(db);
  }

  /**
   * Get available OAuth providers
   */
  getProviders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organization_id;
      const providers = await this.oauthService.getProviders(organizationId);

      // Hide sensitive information
      const sanitized = providers.map(p => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        is_active: p.is_active,
        scopes: p.scopes
      }));

      res.json({
        success: true,
        data: sanitized
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Start OAuth authorization flow
   */
  authorize = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider: providerName } = req.params;
      const { redirect_uri } = req.query;
      const organizationId = (req as any).user?.organization_id;

      if (!redirect_uri) {
        return res.status(400).json({
          success: false,
          error: 'redirect_uri is required'
        });
      }

      const provider = await this.oauthService.getProvider(providerName, organizationId);

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'OAuth provider not found'
        });
      }

      // Generate state token for CSRF protection
      const state = jwt.sign(
        {
          provider_id: provider.provider_id,
          user_id: (req as any).user?.user_id,
          redirect_uri
        },
        process.env.JWT_SECRET!,
        { expiresIn: '10m' }
      );

      const authUrl = this.oauthService.generateAuthorizationUrl(
        provider,
        redirect_uri as string,
        state
      );

      res.json({
        success: true,
        data: {
          authorization_url: authUrl,
          state
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle OAuth callback
   */
  callback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider: providerName } = req.params;
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).json({
          success: false,
          error: 'code and state are required'
        });
      }

      // Verify state token
      let stateData: any;
      try {
        stateData = jwt.verify(state as string, process.env.JWT_SECRET!);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired state token'
        });
      }

      const provider = await this.oauthService.getProvider(providerName, undefined);

      if (!provider || provider.provider_id !== stateData.provider_id) {
        return res.status(404).json({
          success: false,
          error: 'OAuth provider not found'
        });
      }

      // Exchange code for tokens
      const tokens = await this.oauthService.exchangeCodeForTokens(
        provider,
        code as string,
        stateData.redirect_uri
      );

      // Get user info from provider
      const userInfo = await this.oauthService.getUserInfo(provider, tokens.access_token);

      // Store tokens
      if (stateData.user_id) {
        await this.oauthService.storeTokens({
          user_id: stateData.user_id,
          provider_id: provider.provider_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expires_in: tokens.expires_in,
          provider_user_id: userInfo.id,
          provider_email: userInfo.email,
          provider_data: userInfo
        });
      }

      res.json({
        success: true,
        message: 'OAuth authentication successful',
        data: {
          provider: providerName,
          user_info: {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get connected OAuth accounts
   */
  getConnectedAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.user_id;
      const organizationId = (req as any).user.organization_id;

      const providers = await this.oauthService.getProviders(organizationId);
      const connectedAccounts = [];

      for (const provider of providers) {
        const tokens = await this.oauthService.getTokens(userId, provider.provider_id);
        if (tokens) {
          connectedAccounts.push({
            provider_name: provider.provider_name,
            provider_email: tokens.provider_email,
            connected_at: tokens.created_at,
            last_used_at: tokens.last_used_at
          });
        }
      }

      res.json({
        success: true,
        data: connectedAccounts
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Disconnect OAuth account
   */
  disconnect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider: providerName } = req.params;
      const userId = (req as any).user.user_id;
      const organizationId = (req as any).user.organization_id;

      const provider = await this.oauthService.getProvider(providerName, organizationId);

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'OAuth provider not found'
        });
      }

      await this.oauthService.revokeTokens(userId, provider.provider_id);

      res.json({
        success: true,
        message: 'OAuth account disconnected successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Register OAuth provider (Admin only)
   */
  registerProvider = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        provider_name,
        client_id,
        client_secret,
        scopes,
        auto_create_users,
        default_role_id
      } = req.body;
      const organizationId = (req as any).user.organization_id;

      // Get provider config
      const config = OAuthService.getProviderConfig(provider_name);

      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported OAuth provider'
        });
      }

      const provider = await this.oauthService.registerProvider({
        organization_id: organizationId,
        provider_name,
        client_id,
        client_secret,
        authorization_url: config.authorization_url!,
        token_url: config.token_url!,
        user_info_url: config.user_info_url,
        scopes: scopes || config.scopes,
        auto_create_users,
        default_role_id
      });

      // Hide sensitive data
      const { client_secret: _, ...sanitized } = provider;

      res.status(201).json({
        success: true,
        message: 'OAuth provider registered successfully',
        data: sanitized
      });
    } catch (error) {
      next(error);
    }
  };
}
