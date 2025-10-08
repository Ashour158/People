import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler';

interface IntegrationConfig {
  config_id: string;
  organization_id: string;
  integration_type: 'calendar' | 'communication' | 'payroll' | 'accounting' | 'sso';
  provider: string;
  is_enabled: boolean;
  credentials: any;
  settings: any;
  created_at: Date;
}

interface CalendarEvent {
  event_id: string;
  organization_id: string;
  event_type: 'meeting' | 'interview' | 'leave' | 'holiday' | 'training' | 'other';
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  location?: string;
  attendees?: string[];
  organizer_id: string;
  external_event_id?: string;
  external_link?: string;
  created_at: Date;
}

export class IntegrationService {
  constructor(private db: Pool) {}

  // ==================== INTEGRATION CONFIGURATION ====================

  async createIntegrationConfig(data: {
    organization_id: string;
    integration_type: string;
    provider: string;
    credentials: any;
    settings?: any;
  }): Promise<IntegrationConfig> {
    const config_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO integration_configs (
        config_id, organization_id, integration_type, provider,
        is_enabled, credentials, settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        config_id,
        data.organization_id,
        data.integration_type,
        data.provider,
        true,
        JSON.stringify(data.credentials),
        JSON.stringify(data.settings || {}),
      ]
    );

    return result.rows[0];
  }

  async getIntegrationConfig(
    organization_id: string,
    integration_type: string,
    provider: string
  ): Promise<IntegrationConfig | null> {
    const result = await this.db.query(
      `SELECT * FROM integration_configs
       WHERE organization_id = $1 
         AND integration_type = $2 
         AND provider = $3
         AND is_deleted = FALSE
       LIMIT 1`,
      [organization_id, integration_type, provider]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async updateIntegrationConfig(
    config_id: string,
    organization_id: string,
    data: Partial<IntegrationConfig>
  ): Promise<IntegrationConfig> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'config_id' && key !== 'organization_id') {
        if (key === 'credentials' || key === 'settings') {
          updateFields.push(`${key} = $${paramCounter}`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramCounter}`);
          params.push(value);
        }
        paramCounter++;
      }
    });

    if (updateFields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    updateFields.push(`modified_at = NOW()`);
    params.push(config_id, organization_id);

    const result = await this.db.query(
      `UPDATE integration_configs
       SET ${updateFields.join(', ')}
       WHERE config_id = $${paramCounter} AND organization_id = $${paramCounter + 1}
       AND is_deleted = FALSE
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new AppError('Integration config not found', 404);
    }

    return result.rows[0];
  }

  async deleteIntegrationConfig(
    config_id: string,
    organization_id: string
  ): Promise<void> {
    await this.db.query(
      `UPDATE integration_configs
       SET is_deleted = TRUE, modified_at = NOW()
       WHERE config_id = $1 AND organization_id = $2`,
      [config_id, organization_id]
    );
  }

  // ==================== CALENDAR INTEGRATION ====================

  async syncGoogleCalendarEvent(
    organization_id: string,
    eventData: {
      event_type: string;
      title: string;
      description?: string;
      start_time: Date;
      end_time: Date;
      location?: string;
      attendees?: string[];
      organizer_id: string;
    }
  ): Promise<CalendarEvent> {
    // This is a placeholder for actual Google Calendar API integration
    // In production, you would:
    // 1. Get the Google Calendar credentials from integration_configs
    // 2. Use Google Calendar API to create the event
    // 3. Store the event in the database with the external_event_id

    const config = await this.getIntegrationConfig(
      organization_id,
      'calendar',
      'google'
    );

    if (!config || !config.is_enabled) {
      throw new AppError('Google Calendar integration not configured', 400);
    }

    const event_id = uuidv4();

    // Simulated Google Calendar API call
    const external_event_id = `google_${uuidv4()}`;
    const external_link = `https://calendar.google.com/event?eid=${external_event_id}`;

    const result = await this.db.query(
      `INSERT INTO calendar_events (
        event_id, organization_id, event_type, title, description,
        start_time, end_time, location, attendees, organizer_id,
        external_event_id, external_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        event_id,
        organization_id,
        eventData.event_type,
        eventData.title,
        eventData.description,
        eventData.start_time,
        eventData.end_time,
        eventData.location,
        JSON.stringify(eventData.attendees || []),
        eventData.organizer_id,
        external_event_id,
        external_link,
      ]
    );

    return result.rows[0];
  }

  async syncOutlookCalendarEvent(
    organization_id: string,
    eventData: {
      event_type: string;
      title: string;
      description?: string;
      start_time: Date;
      end_time: Date;
      location?: string;
      attendees?: string[];
      organizer_id: string;
    }
  ): Promise<CalendarEvent> {
    const config = await this.getIntegrationConfig(
      organization_id,
      'calendar',
      'outlook'
    );

    if (!config || !config.is_enabled) {
      throw new AppError('Outlook Calendar integration not configured', 400);
    }

    const event_id = uuidv4();

    // Simulated Outlook Calendar API call
    const external_event_id = `outlook_${uuidv4()}`;
    const external_link = `https://outlook.office365.com/calendar/event/${external_event_id}`;

    const result = await this.db.query(
      `INSERT INTO calendar_events (
        event_id, organization_id, event_type, title, description,
        start_time, end_time, location, attendees, organizer_id,
        external_event_id, external_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        event_id,
        organization_id,
        eventData.event_type,
        eventData.title,
        eventData.description,
        eventData.start_time,
        eventData.end_time,
        eventData.location,
        JSON.stringify(eventData.attendees || []),
        eventData.organizer_id,
        external_event_id,
        external_link,
      ]
    );

    return result.rows[0];
  }

  async getCalendarEvents(
    organization_id: string,
    filters?: {
      event_type?: string;
      start_date?: Date;
      end_date?: Date;
      organizer_id?: string;
    }
  ): Promise<CalendarEvent[]> {
    let query = `
      SELECT 
        ce.*,
        e.first_name || ' ' || e.last_name as organizer_name
      FROM calendar_events ce
      LEFT JOIN employees e ON ce.organizer_id = e.employee_id
      WHERE ce.organization_id = $1 AND ce.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];
    let paramCounter = 2;

    if (filters?.event_type) {
      query += ` AND ce.event_type = $${paramCounter}`;
      params.push(filters.event_type);
      paramCounter++;
    }

    if (filters?.start_date) {
      query += ` AND ce.start_time >= $${paramCounter}`;
      params.push(filters.start_date);
      paramCounter++;
    }

    if (filters?.end_date) {
      query += ` AND ce.end_time <= $${paramCounter}`;
      params.push(filters.end_date);
      paramCounter++;
    }

    if (filters?.organizer_id) {
      query += ` AND ce.organizer_id = $${paramCounter}`;
      params.push(filters.organizer_id);
      paramCounter++;
    }

    query += ` ORDER BY ce.start_time ASC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  // ==================== COMMUNICATION INTEGRATION ====================

  async sendSlackNotification(
    organization_id: string,
    data: {
      channel: string;
      message: string;
      user_id?: string;
    }
  ): Promise<any> {
    const config = await this.getIntegrationConfig(
      organization_id,
      'communication',
      'slack'
    );

    if (!config || !config.is_enabled) {
      throw new AppError('Slack integration not configured', 400);
    }

    // Simulated Slack API call
    // In production, use @slack/web-api package
    return {
      success: true,
      channel: data.channel,
      message: data.message,
      timestamp: new Date(),
    };
  }

  async sendTeamsNotification(
    organization_id: string,
    data: {
      channel: string;
      message: string;
      user_id?: string;
    }
  ): Promise<any> {
    const config = await this.getIntegrationConfig(
      organization_id,
      'communication',
      'teams'
    );

    if (!config || !config.is_enabled) {
      throw new AppError('Microsoft Teams integration not configured', 400);
    }

    // Simulated Teams API call
    // In production, use Microsoft Graph API
    return {
      success: true,
      channel: data.channel,
      message: data.message,
      timestamp: new Date(),
    };
  }

  // ==================== PAYROLL INTEGRATION ====================

  async syncPayrollData(
    organization_id: string,
    provider: 'adp' | 'paychex' | 'gusto',
    payroll_data: any
  ): Promise<any> {
    const config = await this.getIntegrationConfig(
      organization_id,
      'payroll',
      provider
    );

    if (!config || !config.is_enabled) {
      throw new AppError(`${provider} integration not configured`, 400);
    }

    // Simulated payroll sync
    // In production, use provider-specific API
    return {
      success: true,
      provider,
      synced_employees: payroll_data.employees?.length || 0,
      timestamp: new Date(),
    };
  }

  // ==================== ACCOUNTING INTEGRATION ====================

  async syncAccountingData(
    organization_id: string,
    provider: 'quickbooks' | 'zoho_books' | 'xero',
    accounting_data: any
  ): Promise<any> {
    const config = await this.getIntegrationConfig(
      organization_id,
      'accounting',
      provider
    );

    if (!config || !config.is_enabled) {
      throw new AppError(`${provider} integration not configured`, 400);
    }

    // Simulated accounting sync
    // In production, use provider-specific API
    return {
      success: true,
      provider,
      synced_transactions: accounting_data.transactions?.length || 0,
      timestamp: new Date(),
    };
  }

  // ==================== SSO INTEGRATION ====================

  async configureSAMLSSO(
    organization_id: string,
    config: {
      entity_id: string;
      sso_url: string;
      certificate: string;
      attribute_mapping?: any;
    }
  ): Promise<IntegrationConfig> {
    const existing = await this.getIntegrationConfig(
      organization_id,
      'sso',
      'saml'
    );

    if (existing) {
      return await this.updateIntegrationConfig(existing.config_id, organization_id, {
        credentials: config,
      });
    }

    return await this.createIntegrationConfig({
      organization_id,
      integration_type: 'sso',
      provider: 'saml',
      credentials: config,
    });
  }

  async configureOAuth2SSO(
    organization_id: string,
    provider: 'google' | 'microsoft' | 'okta',
    config: {
      client_id: string;
      client_secret: string;
      authorize_url: string;
      token_url: string;
      user_info_url?: string;
    }
  ): Promise<IntegrationConfig> {
    const existing = await this.getIntegrationConfig(
      organization_id,
      'sso',
      provider
    );

    if (existing) {
      return await this.updateIntegrationConfig(existing.config_id, organization_id, {
        credentials: config,
      });
    }

    return await this.createIntegrationConfig({
      organization_id,
      integration_type: 'sso',
      provider,
      credentials: config,
    });
  }
}
