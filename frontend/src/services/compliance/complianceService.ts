/**
 * Compliance Service - Foundation for Compliance Suite
 * Provides interfaces and utilities for regulatory compliance
 */

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'gdpr' | 'ccpa' | 'sox' | 'hipaa' | 'iso27001' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'pending';
  requirements: string[];
  controls: string[];
  lastChecked: Date;
  nextCheck: Date;
}

interface ComplianceCheck {
  id: string;
  ruleId: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  score: number;
  details: string;
  evidence: string[];
  timestamp: Date;
  remediations: string[];
}

interface DataSubject {
  id: string;
  type: 'employee' | 'customer' | 'vendor' | 'applicant';
  personalData: Record<string, any>;
  consentStatus: Record<string, boolean>;
  dataRetention: {
    category: string;
    retentionPeriod: number;
    expiryDate: Date;
  };
  rights: {
    access: boolean;
    rectification: boolean;
    erasure: boolean;
    portability: boolean;
    restriction: boolean;
    objection: boolean;
  };
}

interface DataMapping {
  id: string;
  dataType: string;
  source: string;
  destination: string;
  purpose: string;
  legalBasis: string;
  retentionPeriod: number;
  processors: string[];
  transfers: Array<{
    country: string;
    adequacy: boolean;
    safeguards: string[];
  }>;
}

interface AuditTrail {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  changes: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
  compliance: {
    gdpr: boolean;
    ccpa: boolean;
    sox: boolean;
    hipaa: boolean;
  };
}

class ComplianceService {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_COMPLIANCE_API_URL || '/api/v1/compliance';
    this.apiKey = process.env.REACT_APP_COMPLIANCE_API_KEY || '';
  }

  // GDPR Compliance
  async getGDPRStatus(): Promise<{
    overallScore: number;
    categories: {
      dataMapping: number;
      consentManagement: number;
      dataRetention: number;
      rightToErasure: number;
      dataPortability: number;
      privacyByDesign: number;
    };
    violations: Array<{
      id: string;
      description: string;
      severity: string;
      remediation: string;
    }>;
  }> {
    const response = await fetch(`${this.baseURL}/gdpr/status`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get GDPR status: ${response.statusText}`);
    }

    return response.json();
  }

  // Data Subject Rights
  async getDataSubjects(filters?: {
    type?: string;
    status?: string;
    search?: string;
  }): Promise<DataSubject[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await fetch(`${this.baseURL}/gdpr/data-subjects?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get data subjects: ${response.statusText}`);
    }

    return response.json();
  }

  // Right to Erasure
  async requestErasure(dataSubjectId: string, reason: string): Promise<{
    requestId: string;
    status: string;
    estimatedCompletion: Date;
  }> {
    const response = await fetch(`${this.baseURL}/gdpr/erasure`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dataSubjectId, reason }),
    });

    if (!response.ok) {
      throw new Error(`Failed to request erasure: ${response.statusText}`);
    }

    return response.json();
  }

  // Data Portability
  async requestDataPortability(dataSubjectId: string, format: string): Promise<{
    requestId: string;
    downloadUrl: string;
    expiryDate: Date;
  }> {
    const response = await fetch(`${this.baseURL}/gdpr/portability`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dataSubjectId, format }),
    });

    if (!response.ok) {
      throw new Error(`Failed to request data portability: ${response.statusText}`);
    }

    return response.json();
  }

  // Data Mapping
  async getDataMappings(): Promise<DataMapping[]> {
    const response = await fetch(`${this.baseURL}/gdpr/data-mappings`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get data mappings: ${response.statusText}`);
    }

    return response.json();
  }

  async createDataMapping(mapping: Omit<DataMapping, 'id'>): Promise<{ id: string }> {
    const response = await fetch(`${this.baseURL}/gdpr/data-mappings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mapping),
    });

    if (!response.ok) {
      throw new Error(`Failed to create data mapping: ${response.statusText}`);
    }

    return response.json();
  }

  // Compliance Rules
  async getComplianceRules(category?: string): Promise<ComplianceRule[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);

    const response = await fetch(`${this.baseURL}/rules?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get compliance rules: ${response.statusText}`);
    }

    return response.json();
  }

  // Compliance Checks
  async runComplianceCheck(ruleId: string): Promise<ComplianceCheck> {
    const response = await fetch(`${this.baseURL}/checks/${ruleId}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to run compliance check: ${response.statusText}`);
    }

    return response.json();
  }

  async getComplianceChecks(filters?: {
    ruleId?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<ComplianceCheck[]> {
    const params = new URLSearchParams();
    if (filters?.ruleId) params.append('ruleId', filters.ruleId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateRange) {
      params.append('start', filters.dateRange.start.toISOString());
      params.append('end', filters.dateRange.end.toISOString());
    }

    const response = await fetch(`${this.baseURL}/checks?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get compliance checks: ${response.statusText}`);
    }

    return response.json();
  }

  // Audit Trail
  async getAuditTrail(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    dateRange?: { start: Date; end: Date };
    riskLevel?: string;
  }): Promise<AuditTrail[]> {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.resource) params.append('resource', filters.resource);
    if (filters?.dateRange) {
      params.append('start', filters.dateRange.start.toISOString());
      params.append('end', filters.dateRange.end.toISOString());
    }
    if (filters?.riskLevel) params.append('riskLevel', filters.riskLevel);

    const response = await fetch(`${this.baseURL}/audit-trail?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get audit trail: ${response.statusText}`);
    }

    return response.json();
  }

  // Compliance Reports
  async generateComplianceReport(config: {
    frameworks: string[];
    dateRange: { start: Date; end: Date };
    includeRemediations: boolean;
    format: 'pdf' | 'excel' | 'csv';
  }): Promise<{
    reportId: string;
    downloadUrl: string;
    expiryDate: Date;
  }> {
    const response = await fetch(`${this.baseURL}/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate compliance report: ${response.statusText}`);
    }

    return response.json();
  }

  // Consent Management
  async updateConsent(dataSubjectId: string, purpose: string, consent: boolean): Promise<{
    status: string;
    timestamp: Date;
  }> {
    const response = await fetch(`${this.baseURL}/gdpr/consent`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dataSubjectId, purpose, consent }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update consent: ${response.statusText}`);
    }

    return response.json();
  }

  // Data Retention
  async getDataRetentionPolicies(): Promise<Array<{
    category: string;
    retentionPeriod: number;
    legalBasis: string;
    autoDelete: boolean;
  }>> {
    const response = await fetch(`${this.baseURL}/gdpr/retention-policies`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get data retention policies: ${response.statusText}`);
    }

    return response.json();
  }

  // Privacy Impact Assessment
  async createPrivacyImpactAssessment(assessment: {
    name: string;
    description: string;
    dataTypes: string[];
    purposes: string[];
    risks: Array<{
      risk: string;
      likelihood: number;
      impact: number;
      mitigation: string;
    }>;
  }): Promise<{ assessmentId: string }> {
    const response = await fetch(`${this.baseURL}/gdpr/pia`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assessment),
    });

    if (!response.ok) {
      throw new Error(`Failed to create privacy impact assessment: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const complianceService = new ComplianceService();

// Export types for use in components
export type { ComplianceRule, ComplianceCheck, DataSubject, DataMapping, AuditTrail };
