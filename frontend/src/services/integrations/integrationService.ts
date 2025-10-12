/**
 * Integration Service - Foundation for Integration Marketplace
 * Provides interfaces and utilities for third-party integrations
 */

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'communication' | 'payroll' | 'recruitment' | 'analytics' | 'security';
  status: 'available' | 'installed' | 'configured' | 'error';
  version: string;
  author: string;
  icon: string;
  website: string;
  documentation: string;
  configuration: Record<string, any>;
  capabilities: string[];
  pricing: {
    type: 'free' | 'freemium' | 'paid';
    price?: number;
    currency?: string;
    period?: 'monthly' | 'yearly';
  };
  requirements: {
    permissions: string[];
    scopes: string[];
    webhooks: string[];
  };
  lastUpdated: Date;
  rating: number;
  reviews: number;
}

interface IntegrationConfig {
  integrationId: string;
  enabled: boolean;
  settings: Record<string, any>;
  webhooks: Array<{
    event: string;
    url: string;
    secret: string;
    enabled: boolean;
  }>;
  apiKeys: Record<string, string>;
  permissions: string[];
}

interface WebhookEvent {
  id: string;
  integrationId: string;
  event: string;
  data: any;
  timestamp: Date;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  retryCount: number;
  error?: string;
}

class IntegrationService {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_INTEGRATION_API_URL || '/api/v1/integrations';
    this.apiKey = process.env.REACT_APP_INTEGRATION_API_KEY || '';
  }

  // Get all available integrations
  async getIntegrations(filters?: {
    category?: string;
    status?: string;
    search?: string;
  }): Promise<Integration[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await fetch(`${this.baseURL}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch integrations: ${response.statusText}`);
    }

    return response.json();
  }

  // Get integration by ID
  async getIntegration(integrationId: string): Promise<Integration> {
    const response = await fetch(`${this.baseURL}/${integrationId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch integration: ${response.statusText}`);
    }

    return response.json();
  }

  // Install integration
  async installIntegration(integrationId: string): Promise<{ status: string; configId: string }> {
    const response = await fetch(`${this.baseURL}/${integrationId}/install`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to install integration: ${response.statusText}`);
    }

    return response.json();
  }

  // Uninstall integration
  async uninstallIntegration(integrationId: string): Promise<{ status: string }> {
    const response = await fetch(`${this.baseURL}/${integrationId}/uninstall`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to uninstall integration: ${response.statusText}`);
    }

    return response.json();
  }

  // Configure integration
  async configureIntegration(
    integrationId: string,
    config: IntegrationConfig
  ): Promise<{ status: string; configId: string }> {
    const response = await fetch(`${this.baseURL}/${integrationId}/configure`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to configure integration: ${response.statusText}`);
    }

    return response.json();
  }

  // Test integration connection
  async testIntegration(integrationId: string): Promise<{
    status: 'success' | 'error';
    message: string;
    latency?: number;
  }> {
    const response = await fetch(`${this.baseURL}/${integrationId}/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to test integration: ${response.statusText}`);
    }

    return response.json();
  }

  // Get integration status
  async getIntegrationStatus(integrationId: string): Promise<{
    status: string;
    lastSync?: Date;
    errorCount: number;
    healthScore: number;
  }> {
    const response = await fetch(`${this.baseURL}/${integrationId}/status`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get integration status: ${response.statusText}`);
    }

    return response.json();
  }

  // Sync integration data
  async syncIntegration(integrationId: string, force: boolean = false): Promise<{
    status: string;
    recordsProcessed: number;
    errors: number;
  }> {
    const response = await fetch(`${this.baseURL}/${integrationId}/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync integration: ${response.statusText}`);
    }

    return response.json();
  }

  // Get webhook events
  async getWebhookEvents(integrationId: string, filters?: {
    event?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ events: WebhookEvent[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.event) params.append('event', filters.event);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await fetch(`${this.baseURL}/${integrationId}/webhooks?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get webhook events: ${response.statusText}`);
    }

    return response.json();
  }

  // Retry failed webhook
  async retryWebhook(integrationId: string, webhookId: string): Promise<{ status: string }> {
    const response = await fetch(`${this.baseURL}/${integrationId}/webhooks/${webhookId}/retry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to retry webhook: ${response.statusText}`);
    }

    return response.json();
  }

  // Get integration analytics
  async getIntegrationAnalytics(integrationId: string, timeframe: string): Promise<{
    syncCount: number;
    errorCount: number;
    averageLatency: number;
    uptime: number;
    dataVolume: number;
  }> {
    const response = await fetch(`${this.baseURL}/${integrationId}/analytics?timeframe=${timeframe}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get integration analytics: ${response.statusText}`);
    }

    return response.json();
  }

  // Create custom integration
  async createCustomIntegration(integration: Omit<Integration, 'id' | 'lastUpdated'>): Promise<{
    id: string;
    status: string;
  }> {
    const response = await fetch(`${this.baseURL}/custom`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(integration),
    });

    if (!response.ok) {
      throw new Error(`Failed to create custom integration: ${response.statusText}`);
    }

    return response.json();
  }

  // Update integration settings
  async updateIntegrationSettings(
    integrationId: string,
    settings: Record<string, any>
  ): Promise<{ status: string }> {
    const response = await fetch(`${this.baseURL}/${integrationId}/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`Failed to update integration settings: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();

// Export types for use in components
export type { Integration, IntegrationConfig, WebhookEvent };
