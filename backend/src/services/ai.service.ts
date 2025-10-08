import axios, { AxiosInstance } from 'axios';
import { Pool } from 'pg';
import db from '../config/database';
import logger from '../utils/logger';

// =====================================================
// AI SERVICE - OPENAI INTEGRATION
// =====================================================

interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface AIUsageLog {
  organizationId: string;
  featureType: string;
  userId?: string;
  tokensUsed?: number;
  costUsd?: number;
  processingTimeMs: number;
  status: 'success' | 'error' | 'rate_limited';
  errorMessage?: string;
}

export class AIService {
  private openaiClient: AxiosInstance;
  private config: OpenAIConfig;
  private db: Pool;

  constructor() {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096'),
    };

    this.openaiClient = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    this.db = db;
  }

  // =====================================================
  // RESUME PARSING
  // =====================================================

  async parseResume(
    organizationId: string,
    fileContent: string,
    fileName: string,
    userId?: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const prompt = this.buildResumeParsingPrompt(fileContent);
      
      const response = await this.openaiClient.post('/chat/completions', {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR assistant that extracts structured information from resumes. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: this.config.maxTokens,
      });

      const parsedData = JSON.parse(response.data.choices[0].message.content);
      const processingTime = Date.now() - startTime;

      // Log usage
      await this.logAIUsage({
        organizationId,
        featureType: 'resume_parsing',
        userId,
        tokensUsed: response.data.usage.total_tokens,
        costUsd: this.calculateCost(response.data.usage.total_tokens),
        processingTimeMs: processingTime,
        status: 'success',
      });

      // Store parsed resume
      const result = await this.db.query(
        `INSERT INTO parsed_resumes (
          organization_id, original_filename, file_type,
          candidate_name, email, phone, location,
          professional_summary, total_experience_years,
          skills, skill_categories, work_experience, education,
          certifications, languages, linkedin_url, github_url,
          parsing_method, parsing_confidence, parsing_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING parsed_resume_id`,
        [
          organizationId,
          fileName,
          this.getFileType(fileName),
          parsedData.name,
          parsedData.email,
          parsedData.phone,
          parsedData.location,
          parsedData.summary,
          parsedData.totalExperience,
          JSON.stringify(parsedData.skills),
          JSON.stringify(parsedData.skillCategories),
          JSON.stringify(parsedData.workExperience),
          JSON.stringify(parsedData.education),
          JSON.stringify(parsedData.certifications),
          JSON.stringify(parsedData.languages),
          parsedData.linkedin,
          parsedData.github,
          'openai',
          parsedData.confidence || 85,
          this.config.model,
        ]
      );

      return {
        parsedResumeId: result.rows[0].parsed_resume_id,
        ...parsedData,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      await this.logAIUsage({
        organizationId,
        featureType: 'resume_parsing',
        userId,
        processingTimeMs: processingTime,
        status: 'error',
        errorMessage: error.message,
      });
      throw error;
    }
  }

  private buildResumeParsingPrompt(content: string): string {
    return `Extract structured information from this resume and return as JSON:

${content}

Return JSON with this exact structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "summary": "Professional summary",
  "totalExperience": 5.5,
  "skills": [
    {"skill": "Python", "proficiency": "Expert", "years": 5},
    {"skill": "JavaScript", "proficiency": "Advanced", "years": 3}
  ],
  "skillCategories": {
    "technical": ["Python", "JavaScript", "SQL"],
    "soft": ["Leadership", "Communication"],
    "languages": ["English", "Spanish"]
  },
  "workExperience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "duration": "Jan 2020 - Present",
      "responsibilities": ["Responsibility 1", "Responsibility 2"],
      "achievements": ["Achievement 1"]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "major": "Computer Science",
      "institution": "University Name",
      "year": "2019",
      "gpa": "3.8"
    }
  ],
  "certifications": [
    {"name": "AWS Certified", "issuer": "Amazon", "date": "2022", "expiry": "2025"}
  ],
  "languages": [
    {"language": "English", "proficiency": "Native"},
    {"language": "Spanish", "proficiency": "Intermediate"}
  ],
  "linkedin": "https://linkedin.com/in/profile",
  "github": "https://github.com/username",
  "confidence": 90
}`;
  }

  // =====================================================
  // CANDIDATE MATCHING
  // =====================================================

  async matchCandidates(
    organizationId: string,
    jobRequirements: any,
    candidates: any[],
    userId?: string
  ): Promise<any[]> {
    const results = [];

    for (const candidate of candidates) {
      const score = await this.scoreCandidateMatch(
        organizationId,
        jobRequirements,
        candidate,
        userId
      );
      results.push(score);
    }

    return results.sort((a, b) => b.overallScore - a.overallScore);
  }

  private async scoreCandidateMatch(
    organizationId: string,
    jobRequirements: any,
    candidate: any,
    userId?: string
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const prompt = this.buildCandidateMatchingPrompt(jobRequirements, candidate);

      const response = await this.openaiClient.post('/chat/completions', {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert recruiter. Analyze candidate fit for a job and return structured JSON scoring.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      });

      const matchData = JSON.parse(response.data.choices[0].message.content);
      const processingTime = Date.now() - startTime;

      await this.logAIUsage({
        organizationId,
        featureType: 'candidate_matching',
        userId,
        tokensUsed: response.data.usage.total_tokens,
        costUsd: this.calculateCost(response.data.usage.total_tokens),
        processingTimeMs: processingTime,
        status: 'success',
      });

      // Store match score
      await this.db.query(
        `INSERT INTO candidate_match_scores (
          organization_id, overall_score, recommendation, confidence_level,
          skills_match_score, experience_match_score, education_match_score,
          matched_skills, skill_gaps, strengths, concerns,
          interview_focus_areas, suggested_questions, model_version, calculation_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          organizationId,
          matchData.overallScore,
          matchData.recommendation,
          matchData.confidence,
          matchData.skillsMatch,
          matchData.experienceMatch,
          matchData.educationMatch,
          JSON.stringify(matchData.matchedSkills),
          JSON.stringify(matchData.skillGaps),
          JSON.stringify(matchData.strengths),
          JSON.stringify(matchData.concerns),
          matchData.interviewFocusAreas,
          matchData.suggestedQuestions,
          this.config.model,
          'openai',
        ]
      );

      return matchData;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      await this.logAIUsage({
        organizationId,
        featureType: 'candidate_matching',
        userId,
        processingTimeMs: processingTime,
        status: 'error',
        errorMessage: error.message,
      });
      throw error;
    }
  }

  private buildCandidateMatchingPrompt(jobRequirements: any, candidate: any): string {
    return `Analyze this candidate's fit for the job position:

JOB REQUIREMENTS:
${JSON.stringify(jobRequirements, null, 2)}

CANDIDATE PROFILE:
${JSON.stringify(candidate, null, 2)}

Provide a detailed matching analysis in JSON format:
{
  "overallScore": 85,
  "recommendation": "strong_fit",
  "confidence": 90,
  "skillsMatch": 90,
  "experienceMatch": 80,
  "educationMatch": 85,
  "matchedSkills": [{"skill": "Python", "requiredLevel": "Expert", "candidateLevel": "Expert"}],
  "skillGaps": [{"skill": "Kubernetes", "requiredLevel": "Intermediate", "gap": "Needs training"}],
  "strengths": ["Strong technical background", "Leadership experience"],
  "concerns": ["Limited experience with specific technology"],
  "interviewFocusAreas": ["Cloud architecture experience", "Team management"],
  "suggestedQuestions": ["Tell me about your Kubernetes experience"]
}`;
  }

  // =====================================================
  // ATTRITION PREDICTION
  // =====================================================

  async predictAttrition(
    organizationId: string,
    employeeId: string,
    employeeData: any,
    userId?: string
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const prompt = this.buildAttritionPredictionPrompt(employeeData);

      const response = await this.openaiClient.post('/chat/completions', {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an HR analytics expert specializing in employee retention. Analyze employee data to predict attrition risk. Return structured JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2500,
      });

      const prediction = JSON.parse(response.data.choices[0].message.content);
      const processingTime = Date.now() - startTime;

      await this.logAIUsage({
        organizationId,
        featureType: 'attrition_prediction',
        userId,
        tokensUsed: response.data.usage.total_tokens,
        costUsd: this.calculateCost(response.data.usage.total_tokens),
        processingTimeMs: processingTime,
        status: 'success',
      });

      // Store prediction
      await this.db.query(
        `INSERT INTO attrition_predictions (
          organization_id, employee_id, risk_score, risk_level, confidence,
          predicted_exit_date, prediction_timeframe, contributing_factors,
          risk_indicators, retention_actions, manager_talking_points,
          intervention_urgency, model_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          organizationId,
          employeeId,
          prediction.riskScore,
          prediction.riskLevel,
          prediction.confidence,
          prediction.predictedExitDate,
          prediction.timeframe,
          JSON.stringify(prediction.contributingFactors),
          JSON.stringify(prediction.riskIndicators),
          JSON.stringify(prediction.retentionActions),
          prediction.talkingPoints,
          prediction.urgency,
          this.config.model,
        ]
      );

      return prediction;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      await this.logAIUsage({
        organizationId,
        featureType: 'attrition_prediction',
        userId,
        processingTimeMs: processingTime,
        status: 'error',
        errorMessage: error.message,
      });
      throw error;
    }
  }

  private buildAttritionPredictionPrompt(employeeData: any): string {
    return `Analyze this employee's attrition risk:

EMPLOYEE DATA:
${JSON.stringify(employeeData, null, 2)}

Provide risk assessment in JSON:
{
  "riskScore": 75,
  "riskLevel": "high",
  "confidence": 85,
  "predictedExitDate": "2025-06-15",
  "timeframe": "3-6_months",
  "contributingFactors": [
    {"factor": "Salary below market", "weight": 0.35, "score": 80},
    {"factor": "No promotion in 3 years", "weight": 0.25, "score": 70}
  ],
  "riskIndicators": {
    "tenureRisk": 60,
    "performanceRisk": 30,
    "engagementRisk": 80
  },
  "retentionActions": [
    {"action": "Salary review", "priority": "high", "expectedImpact": "Reduce risk by 30%", "estimatedCost": 10000}
  ],
  "talkingPoints": ["Career development opportunities", "Market compensation alignment"],
  "urgency": "soon"
}`;
  }

  // =====================================================
  // SENTIMENT ANALYSIS
  // =====================================================

  async analyzeSentiment(
    organizationId: string,
    textContent: string,
    sourceType: string,
    sourceId: string,
    employeeId?: string,
    userId?: string
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const prompt = this.buildSentimentAnalysisPrompt(textContent);

      const response = await this.openaiClient.post('/chat/completions', {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Analyze text for sentiment, emotions, and topics. Return structured JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const analysis = JSON.parse(response.data.choices[0].message.content);
      const processingTime = Date.now() - startTime;

      await this.logAIUsage({
        organizationId,
        featureType: 'sentiment_analysis',
        userId,
        tokensUsed: response.data.usage.total_tokens,
        costUsd: this.calculateCost(response.data.usage.total_tokens),
        processingTimeMs: processingTime,
        status: 'success',
      });

      // Store analysis
      const result = await this.db.query(
        `INSERT INTO sentiment_analyses (
          organization_id, source_type, source_id, employee_id, text_content,
          sentiment_score, sentiment_category, confidence, emotions,
          dominant_emotion, topics, key_phrases, categories, intent,
          urgency, requires_action, action_type, suggested_response,
          analysis_method, model_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING analysis_id`,
        [
          organizationId,
          sourceType,
          sourceId,
          employeeId,
          textContent,
          analysis.sentimentScore,
          analysis.sentimentCategory,
          analysis.confidence,
          JSON.stringify(analysis.emotions),
          analysis.dominantEmotion,
          JSON.stringify(analysis.topics),
          analysis.keyPhrases,
          analysis.categories,
          analysis.intent,
          analysis.urgency,
          analysis.requiresAction,
          analysis.actionType,
          analysis.suggestedResponse,
          'openai',
          this.config.model,
        ]
      );

      return {
        analysisId: result.rows[0].analysis_id,
        ...analysis,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      await this.logAIUsage({
        organizationId,
        featureType: 'sentiment_analysis',
        userId,
        processingTimeMs: processingTime,
        status: 'error',
        errorMessage: error.message,
      });
      throw error;
    }
  }

  private buildSentimentAnalysisPrompt(text: string): string {
    return `Analyze the sentiment and content of this text:

"${text}"

Return JSON with:
{
  "sentimentScore": 35,
  "sentimentCategory": "positive",
  "confidence": 90,
  "emotions": {"joy": 0.7, "sadness": 0.1, "anger": 0.0, "fear": 0.2},
  "dominantEmotion": "joy",
  "topics": [{"topic": "work environment", "relevance": 0.9, "sentiment": "positive"}],
  "keyPhrases": ["great team", "challenging projects"],
  "categories": ["work_environment", "team_dynamics"],
  "intent": "compliment",
  "urgency": "low",
  "requiresAction": false,
  "actionType": "acknowledge",
  "suggestedResponse": "Thank you for the positive feedback!"
}`;
  }

  // =====================================================
  // CHATBOT
  // =====================================================

  async chat(
    organizationId: string,
    conversationId: string,
    message: string,
    context: any,
    userId?: string
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Get conversation history
      const history = await this.getChatHistory(conversationId);

      const messages = [
        {
          role: 'system',
          content: `You are a helpful HR assistant. Answer questions about company policies, procedures, benefits, and help with HR-related tasks. 
          
Context: ${JSON.stringify(context)}

Be concise, professional, and helpful. If you don't know something, acknowledge it and offer to escalate.`,
        },
        ...history,
        {
          role: 'user',
          content: message,
        },
      ];

      const response = await this.openaiClient.post('/chat/completions', {
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const reply = response.data.choices[0].message.content;
      const processingTime = Date.now() - startTime;

      await this.logAIUsage({
        organizationId,
        featureType: 'chatbot',
        userId,
        tokensUsed: response.data.usage.total_tokens,
        costUsd: this.calculateCost(response.data.usage.total_tokens),
        processingTimeMs: processingTime,
        status: 'success',
      });

      // Store message
      await this.db.query(
        `INSERT INTO chatbot_messages (
          conversation_id, message_type, message_content, processing_time_ms
        ) VALUES ($1, $2, $3, $4), ($1, $5, $6, $7)`,
        [conversationId, 'user', message, 0, 'bot', reply, processingTime]
      );

      // Update conversation
      await this.db.query(
        `UPDATE chatbot_conversations 
         SET message_count = message_count + 2
         WHERE conversation_id = $1`,
        [conversationId]
      );

      return {
        reply,
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      await this.logAIUsage({
        organizationId,
        featureType: 'chatbot',
        userId,
        processingTimeMs: processingTime,
        status: 'error',
        errorMessage: error.message,
      });
      throw error;
    }
  }

  private async getChatHistory(conversationId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT message_type, message_content
       FROM chatbot_messages
       WHERE conversation_id = $1
       ORDER BY sent_at
       LIMIT 20`,
      [conversationId]
    );

    return result.rows.map((row) => ({
      role: row.message_type === 'user' ? 'user' : 'assistant',
      content: row.message_content,
    }));
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private async logAIUsage(log: AIUsageLog): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO ai_usage_logs (
          organization_id, feature_type, user_id, tokens_used, cost_usd,
          processing_time_ms, status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          log.organizationId,
          log.featureType,
          log.userId,
          log.tokensUsed,
          log.costUsd,
          log.processingTimeMs,
          log.status,
          log.errorMessage,
        ]
      );
    } catch (error) {
      logger.error('Failed to log AI usage:', error);
    }
  }

  private calculateCost(tokens: number): number {
    // GPT-4 Turbo pricing: $0.01 per 1K prompt tokens, $0.03 per 1K completion tokens
    // Simplified: average $0.02 per 1K tokens
    return (tokens / 1000) * 0.02;
  }

  private getFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext || 'unknown';
  }

  // Check if AI features are enabled for organization
  async isFeatureEnabled(
    organizationId: string,
    feature: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `SELECT ${feature}_enabled as enabled
       FROM ai_configurations
       WHERE organization_id = $1`,
      [organizationId]
    );

    return result.rows.length > 0 ? result.rows[0].enabled : false;
  }

  // Get AI usage statistics
  async getUsageStats(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        feature_type,
        COUNT(*) as request_count,
        SUM(tokens_used) as total_tokens,
        SUM(cost_usd) as total_cost,
        AVG(processing_time_ms) as avg_processing_time
       FROM ai_usage_logs
       WHERE organization_id = $1
       AND created_at BETWEEN $2 AND $3
       GROUP BY feature_type`,
      [organizationId, startDate, endDate]
    );

    return result.rows;
  }
}

export default new AIService();
