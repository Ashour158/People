/**
 * AI Service - Foundation for AI/ML Integration
 * Provides interfaces and utilities for AI-powered features
 */

interface AIInsight {
  id: string;
  type: 'attrition_risk' | 'performance_prediction' | 'skill_gap' | 'engagement';
  confidence: number;
  data: any;
  recommendations: string[];
  timestamp: Date;
}

interface AIPrediction {
  id: string;
  model: string;
  prediction: any;
  confidence: number;
  features: Record<string, any>;
  timestamp: Date;
}

interface AIModel {
  id: string;
  name: string;
  version: string;
  type: 'classification' | 'regression' | 'clustering';
  status: 'training' | 'ready' | 'deployed' | 'error';
  accuracy?: number;
  lastTrained?: Date;
}

class AIService {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_AI_API_URL || '/api/v1/ai';
    this.apiKey = process.env.REACT_APP_AI_API_KEY || '';
  }

  // Employee Insights
  async getEmployeeInsights(employeeId: string): Promise<AIInsight[]> {
    const response = await fetch(`${this.baseURL}/insights/employee/${employeeId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`AI insights failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Attrition Risk Prediction
  async predictAttritionRisk(employeeId: string): Promise<AIPrediction> {
    const response = await fetch(`${this.baseURL}/predictions/attrition/${employeeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Attrition prediction failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Performance Prediction
  async predictPerformance(employeeId: string, timeframe: 'quarter' | 'year'): Promise<AIPrediction> {
    const response = await fetch(`${this.baseURL}/predictions/performance/${employeeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timeframe }),
    });

    if (!response.ok) {
      throw new Error(`Performance prediction failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Skill Gap Analysis
  async analyzeSkillGaps(employeeId: string, roleId: string): Promise<AIInsight[]> {
    const response = await fetch(`${this.baseURL}/analysis/skill-gaps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employeeId, roleId }),
    });

    if (!response.ok) {
      throw new Error(`Skill gap analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Resume Analysis
  async analyzeResume(resumeFile: File): Promise<{
    skills: string[];
    experience: number;
    education: string[];
    culturalFit: number;
    jobMatchScore: number;
    interviewQuestions: string[];
    salaryPrediction: number;
  }> {
    const formData = new FormData();
    formData.append('resume', resumeFile);

    const response = await fetch(`${this.baseURL}/analysis/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Resume analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Workforce Planning
  async generateWorkforcePlan(organizationId: string, timeframe: number): Promise<{
    headcountForecast: {
      nextQuarter: number;
      nextYear: number;
      next3Years: number;
    };
    skillGapAnalysis: {
      currentSkills: Record<string, number>;
      requiredSkills: Record<string, number>;
      gapAnalysis: Array<{
        skill: string;
        current: number;
        required: number;
        gap: number;
      }>;
    };
    successionPlanning: {
      criticalPositions: Array<{
        position: string;
        risk: number;
        successors: Array<{
          employeeId: string;
          readinessScore: number;
        }>;
      }>;
    };
  }> {
    const response = await fetch(`${this.baseURL}/planning/workforce`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId, timeframe }),
    });

    if (!response.ok) {
      throw new Error(`Workforce planning failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Model Management
  async getModels(): Promise<AIModel[]> {
    const response = await fetch(`${this.baseURL}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Model fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  async trainModel(modelId: string, data: any): Promise<{ status: string; jobId: string }> {
    const response = await fetch(`${this.baseURL}/models/${modelId}/train`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Model training failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getTrainingStatus(jobId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    accuracy?: number;
    error?: string;
  }> {
    const response = await fetch(`${this.baseURL}/training/${jobId}/status`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Training status fetch failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Batch Predictions
  async batchPredict(predictions: Array<{
    employeeId: string;
    model: string;
    features: Record<string, any>;
  }>): Promise<AIPrediction[]> {
    const response = await fetch(`${this.baseURL}/predictions/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ predictions }),
    });

    if (!response.ok) {
      throw new Error(`Batch prediction failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Feature Engineering
  async extractFeatures(data: any, featureType: string): Promise<Record<string, any>> {
    const response = await fetch(`${this.baseURL}/features/extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, featureType }),
    });

    if (!response.ok) {
      throw new Error(`Feature extraction failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const aiService = new AIService();

// Export types for use in components
export type { AIInsight, AIPrediction, AIModel };
