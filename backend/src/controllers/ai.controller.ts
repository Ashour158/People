import { Request, Response, NextFunction } from 'express';
import aiService from '../services/ai.service';
import { successResponse, errorResponse } from '../utils/response';
import logger from '../utils/logger';

export class AIController {
  // =====================================================
  // RESUME PARSING
  // =====================================================

  async parseResume(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const userId = req.user?.user_id;
      const { fileContent, fileName } = req.body;

      if (!fileContent || !fileName) {
        return errorResponse(res, 'File content and name are required', 400);
      }

      // Check if feature is enabled
      const enabled = await aiService.isFeatureEnabled(
        organizationId,
        'resume_parsing'
      );
      if (!enabled) {
        return errorResponse(res, 'Resume parsing feature is not enabled', 403);
      }

      const result = await aiService.parseResume(
        organizationId,
        fileContent,
        fileName,
        userId
      );

      return successResponse(res, result, 'Resume parsed successfully');
    } catch (error: any) {
      logger.error('Resume parsing error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  async getParsedResumes(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const { page = 1, limit = 10 } = req.query;

      // This would be implemented with pagination logic
      return successResponse(res, [], 'Parsed resumes retrieved');
    } catch (error: any) {
      logger.error('Get parsed resumes error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // =====================================================
  // CANDIDATE MATCHING
  // =====================================================

  async matchCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const userId = req.user?.user_id;
      const { jobRequirements, candidates } = req.body;

      if (!jobRequirements || !candidates) {
        return errorResponse(
          res,
          'Job requirements and candidates are required',
          400
        );
      }

      const enabled = await aiService.isFeatureEnabled(
        organizationId,
        'candidate_matching'
      );
      if (!enabled) {
        return errorResponse(res, 'Candidate matching feature is not enabled', 403);
      }

      const results = await aiService.matchCandidates(
        organizationId,
        jobRequirements,
        candidates,
        userId
      );

      return successResponse(res, results, 'Candidates matched successfully');
    } catch (error: any) {
      logger.error('Candidate matching error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // =====================================================
  // ATTRITION PREDICTION
  // =====================================================

  async predictAttrition(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const userId = req.user?.user_id;
      const { employeeId } = req.params;

      const enabled = await aiService.isFeatureEnabled(
        organizationId,
        'attrition_prediction'
      );
      if (!enabled) {
        return errorResponse(
          res,
          'Attrition prediction feature is not enabled',
          403
        );
      }

      // Fetch employee data (simplified - would normally get from DB)
      const employeeData = {
        tenure: 3.5,
        lastPromotion: 2.5,
        performanceRating: 4.2,
        salaryPercentile: 45,
        engagementScore: 65,
        attendanceRate: 92,
        leaveUtilization: 85,
      };

      const prediction = await aiService.predictAttrition(
        organizationId,
        employeeId,
        employeeData,
        userId
      );

      return successResponse(res, prediction, 'Attrition risk calculated');
    } catch (error: any) {
      logger.error('Attrition prediction error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  async getAttritionRisks(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const { riskLevel } = req.query;

      // This would query the attrition_predictions table
      return successResponse(res, [], 'Attrition risks retrieved');
    } catch (error: any) {
      logger.error('Get attrition risks error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // =====================================================
  // PERFORMANCE PREDICTION
  // =====================================================

  async predictPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const userId = req.user?.user_id;
      const { employeeId } = req.params;

      const enabled = await aiService.isFeatureEnabled(
        organizationId,
        'performance_prediction'
      );
      if (!enabled) {
        return errorResponse(
          res,
          'Performance prediction feature is not enabled',
          403
        );
      }

      // Implementation would be similar to attrition prediction
      return successResponse(res, {}, 'Performance predicted');
    } catch (error: any) {
      logger.error('Performance prediction error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // =====================================================
  // SENTIMENT ANALYSIS
  // =====================================================

  async analyzeSentiment(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const userId = req.user?.user_id;
      const { text, sourceType, sourceId, employeeId } = req.body;

      if (!text || !sourceType || !sourceId) {
        return errorResponse(
          res,
          'Text, source type, and source ID are required',
          400
        );
      }

      const enabled = await aiService.isFeatureEnabled(
        organizationId,
        'sentiment_analysis'
      );
      if (!enabled) {
        return errorResponse(
          res,
          'Sentiment analysis feature is not enabled',
          403
        );
      }

      const analysis = await aiService.analyzeSentiment(
        organizationId,
        text,
        sourceType,
        sourceId,
        employeeId,
        userId
      );

      return successResponse(res, analysis, 'Sentiment analyzed successfully');
    } catch (error: any) {
      logger.error('Sentiment analysis error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  async getSentimentTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const { period = 'monthly', departmentId } = req.query;

      // This would query sentiment_trends table
      return successResponse(res, [], 'Sentiment trends retrieved');
    } catch (error: any) {
      logger.error('Get sentiment trends error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // =====================================================
  // SKILLS ANALYSIS
  // =====================================================

  async analyzeSkillsGap(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const userId = req.user?.user_id;
      const { scope, departmentId } = req.body;

      const enabled = await aiService.isFeatureEnabled(
        organizationId,
        'skills_analysis'
      );
      if (!enabled) {
        return errorResponse(res, 'Skills analysis feature is not enabled', 403);
      }

      // Implementation would analyze current vs required skills
      return successResponse(res, {}, 'Skills gap analyzed');
    } catch (error: any) {
      logger.error('Skills gap analysis error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  async recommendLearningPath(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const userId = req.user?.user_id;
      const { employeeId } = req.params;

      // Implementation would generate personalized learning recommendations
      return successResponse(res, {}, 'Learning path recommended');
    } catch (error: any) {
      logger.error('Learning path recommendation error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // =====================================================
  // CHATBOT
  // =====================================================

  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const userId = req.user?.user_id;
      const { conversationId, message, context } = req.body;

      if (!conversationId || !message) {
        return errorResponse(res, 'Conversation ID and message are required', 400);
      }

      const enabled = await aiService.isFeatureEnabled(
        organizationId,
        'chatbot'
      );
      if (!enabled) {
        return errorResponse(res, 'Chatbot feature is not enabled', 403);
      }

      const response = await aiService.chat(
        organizationId,
        conversationId,
        message,
        context || {},
        userId
      );

      return successResponse(res, response, 'Message sent successfully');
    } catch (error: any) {
      logger.error('Chatbot error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  async getChatHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const { conversationId } = req.params;

      // This would retrieve chat history
      return successResponse(res, [], 'Chat history retrieved');
    } catch (error: any) {
      logger.error('Get chat history error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // =====================================================
  // AI CONFIGURATION & USAGE
  // =====================================================

  async getAIConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;

      // This would retrieve AI configuration for the organization
      return successResponse(res, {}, 'AI configuration retrieved');
    } catch (error: any) {
      logger.error('Get AI config error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  async updateAIConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const config = req.body;

      // This would update AI configuration
      return successResponse(res, {}, 'AI configuration updated');
    } catch (error: any) {
      logger.error('Update AI config error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  async getUsageStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organization_id;
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const stats = await aiService.getUsageStats(organizationId, start, end);

      return successResponse(res, stats, 'AI usage statistics retrieved');
    } catch (error: any) {
      logger.error('Get usage stats error:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

export default new AIController();
