import { Pool } from 'pg';
import * as crypto from 'crypto';
import axios from 'axios';
import { logger } from '../config/logger';

export interface OAuthProvider {
  provider_id: string;
  organization_id?: string;
  provider_name: string;
  client_id: string;
  client_secret: string;
  authorization_url: string;
  token_url: string;
  user_info_url?: string;
  scopes: string[];
  is_active: boolean;
  auto_create_users: boolean;
  config: Record<string, any>;
}

export interface OAuthToken {
  token_id: string;
  user_id: string;
  provider_id: string;
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at?: Date;
  scopes?: string[];
  provider_user_id?: string;
  provider_email?: string;
  provider_data: Record<string, any>;
}

export class OAuthService {
  constructor(private db: Pool) {}

  /**
   * Register OAuth provider
   */
  async registerProvider(data: {
    organization_id?: string;
    provider_name: string;
    client_id: string;
    client_secret: string;
    authorization_url: string;
    token_url: string;
    user_info_url?: string;
    scopes?: string[];
    auto_create_users?: boolean;
    default_role_id?: string;
    config?: Record<string, any>;
  }): Promise<OAuthProvider> {
    const result = await this.db.query(
      `INSERT INTO oauth_providers 
       (organization_id, provider_name, client_id, client_secret, authorization_url, 
        token_url, user_info_url, scopes, auto_create_users, default_role_id, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.organization_id || null,
        data.provider_name,
        data.client_id,
        data.client_secret, // Should be encrypted in production
        data.authorization_url,
        data.token_url,
        data.user_info_url || null,
        data.scopes || ['openid', 'profile', 'email'],
        data.auto_create_users || false,
        data.default_role_id || null,
        JSON.stringify(data.config || {})
      ]
    );

    return result.rows[0];
  }

  /**
   * Get OAuth provider by name
   */
  async getProvider(providerName: string, organizationId?: string): Promise<OAuthProvider | null> {
    const result = await this.db.query(
      `SELECT * FROM oauth_providers 
       WHERE provider_name = $1 
       AND (organization_id = $2 OR organization_id IS NULL)
       AND is_active = TRUE
       ORDER BY organization_id DESC NULLS LAST
       LIMIT 1`,
      [providerName, organizationId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all providers for organization
   */
  async getProviders(organizationId?: string): Promise<OAuthProvider[]> {
    const result = await this.db.query(
      `SELECT * FROM oauth_providers 
       WHERE (organization_id = $1 OR organization_id IS NULL)
       AND is_active = TRUE
       ORDER BY provider_name`,
      [organizationId]
    );

    return result.rows;
  }

  /**
   * Generate authorization URL
   */
  generateAuthorizationUrl(
    provider: OAuthProvider,
    redirectUri: string,
    state?: string
  ): string {
    const params = new URLSearchParams({
      client_id: provider.client_id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      state: state || crypto.randomBytes(16).toString('hex')
    });

    return `${provider.authorization_url}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    provider: OAuthProvider,
    code: string,
    redirectUri: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
    scope?: string;
  }> {
    try {
      const response = await axios.post(
        provider.token_url,
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: provider.client_id,
          client_secret: provider.client_secret
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Error exchanging authorization code:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Get user info from OAuth provider
   */
  async getUserInfo(
    provider: OAuthProvider,
    accessToken: string
  ): Promise<{
    id: string;
    email: string;
    name?: string;
    picture?: string;
    [key: string]: any;
  }> {
    if (!provider.user_info_url) {
      throw new Error('Provider does not support user info endpoint');
    }

    try {
      const response = await axios.get(provider.user_info_url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('Error fetching user info:', error);
      throw new Error('Failed to fetch user information from provider');
    }
  }

  /**
   * Store OAuth tokens for user
   */
  async storeTokens(data: {
    user_id: string;
    provider_id: string;
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
    scopes?: string[];
    provider_user_id?: string;
    provider_email?: string;
    provider_data?: Record<string, any>;
  }): Promise<OAuthToken> {
    const expires_at = data.expires_in 
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

    // Check if token already exists
    const existing = await this.db.query(
      `SELECT token_id FROM oauth_tokens 
       WHERE user_id = $1 AND provider_id = $2`,
      [data.user_id, data.provider_id]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing token
      result = await this.db.query(
        `UPDATE oauth_tokens 
         SET access_token = $1, refresh_token = $2, token_type = $3, 
             expires_at = $4, scopes = $5, provider_user_id = $6, 
             provider_email = $7, provider_data = $8, modified_at = CURRENT_TIMESTAMP,
             last_used_at = CURRENT_TIMESTAMP
         WHERE user_id = $9 AND provider_id = $10
         RETURNING *`,
        [
          data.access_token,
          data.refresh_token || null,
          data.token_type,
          expires_at,
          data.scopes || [],
          data.provider_user_id || null,
          data.provider_email || null,
          JSON.stringify(data.provider_data || {}),
          data.user_id,
          data.provider_id
        ]
      );
    } else {
      // Insert new token
      result = await this.db.query(
        `INSERT INTO oauth_tokens 
         (user_id, provider_id, access_token, refresh_token, token_type, 
          expires_at, scopes, provider_user_id, provider_email, provider_data, last_used_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          data.user_id,
          data.provider_id,
          data.access_token,
          data.refresh_token || null,
          data.token_type,
          expires_at,
          data.scopes || [],
          data.provider_user_id || null,
          data.provider_email || null,
          JSON.stringify(data.provider_data || {})
        ]
      );
    }

    return result.rows[0];
  }

  /**
   * Get stored tokens for user and provider
   */
  async getTokens(userId: string, providerId: string): Promise<OAuthToken | null> {
    const result = await this.db.query(
      `SELECT * FROM oauth_tokens 
       WHERE user_id = $1 AND provider_id = $2`,
      [userId, providerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    provider: OAuthProvider,
    refreshToken: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
  }> {
    try {
      const response = await axios.post(
        provider.token_url,
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: provider.client_id,
          client_secret: provider.client_secret
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Revoke OAuth tokens
   */
  async revokeTokens(userId: string, providerId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM oauth_tokens 
       WHERE user_id = $1 AND provider_id = $2`,
      [userId, providerId]
    );
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(tokenId: string): Promise<void> {
    await this.db.query(
      `UPDATE oauth_tokens 
       SET last_used_at = CURRENT_TIMESTAMP 
       WHERE token_id = $1`,
      [tokenId]
    );
  }

  /**
   * Get provider configurations for common providers
   */
  static getProviderConfig(providerName: string): Partial<OAuthProvider> | null {
    const configs: Record<string, Partial<OAuthProvider>> = {
      google: {
        authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
        token_url: 'https://oauth2.googleapis.com/token',
        user_info_url: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'profile', 'email']
      },
      microsoft: {
        authorization_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        token_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        user_info_url: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'profile', 'email', 'User.Read']
      },
      github: {
        authorization_url: 'https://github.com/login/oauth/authorize',
        token_url: 'https://github.com/login/oauth/access_token',
        user_info_url: 'https://api.github.com/user',
        scopes: ['read:user', 'user:email']
      },
      linkedin: {
        authorization_url: 'https://www.linkedin.com/oauth/v2/authorization',
        token_url: 'https://www.linkedin.com/oauth/v2/accessToken',
        user_info_url: 'https://api.linkedin.com/v2/me',
        scopes: ['r_liteprofile', 'r_emailaddress']
      }
    };

    return configs[providerName] || null;
  }
}
