import { Router } from 'express';
import aiController from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// =====================================================
// RESUME PARSING
// =====================================================

/**
 * @route   POST /api/v1/ai/parse-resume
 * @desc    Parse resume and extract structured information
 * @access  Private (HR, Recruiter)
 */
router.post(
  '/parse-resume',
  requirePermission('recruitment:manage'),
  aiController.parseResume
);

/**
 * @route   GET /api/v1/ai/parsed-resumes
 * @desc    Get list of parsed resumes
 * @access  Private (HR, Recruiter)
 */
router.get(
  '/parsed-resumes',
  requirePermission('recruitment:view'),
  aiController.getParsedResumes
);

// =====================================================
// CANDIDATE MATCHING
// =====================================================

/**
 * @route   POST /api/v1/ai/match-candidates
 * @desc    Match candidates to job requirements
 * @access  Private (HR, Recruiter)
 */
router.post(
  '/match-candidates',
  requirePermission('recruitment:manage'),
  aiController.matchCandidates
);

// =====================================================
// ATTRITION PREDICTION
// =====================================================

/**
 * @route   GET /api/v1/ai/attrition-risk
 * @desc    Get high-risk employees list
 * @access  Private (Admin, HR Manager)
 */
router.get(
  '/attrition-risk',
  requirePermission('analytics:view'),
  aiController.getAttritionRisks
);

/**
 * @route   POST /api/v1/ai/attrition-risk/:employeeId
 * @desc    Calculate attrition risk for specific employee
 * @access  Private (Admin, HR Manager)
 */
router.post(
  '/attrition-risk/:employeeId',
  requirePermission('analytics:manage'),
  aiController.predictAttrition
);

// =====================================================
// PERFORMANCE PREDICTION
// =====================================================

/**
 * @route   POST /api/v1/ai/predict-performance/:employeeId
 * @desc    Predict employee performance
 * @access  Private (Admin, HR Manager, Manager)
 */
router.post(
  '/predict-performance/:employeeId',
  requirePermission('performance:manage'),
  aiController.predictPerformance
);

// =====================================================
// SENTIMENT ANALYSIS
// =====================================================

/**
 * @route   POST /api/v1/ai/analyze-sentiment
 * @desc    Analyze sentiment of text feedback
 * @access  Private (HR, Manager)
 */
router.post(
  '/analyze-sentiment',
  requirePermission('analytics:manage'),
  aiController.analyzeSentiment
);

/**
 * @route   GET /api/v1/ai/sentiment-trends
 * @desc    Get sentiment trends over time
 * @access  Private (HR, Manager)
 */
router.get(
  '/sentiment-trends',
  requirePermission('analytics:view'),
  aiController.getSentimentTrends
);

// =====================================================
// SKILLS ANALYSIS
// =====================================================

/**
 * @route   POST /api/v1/ai/skills-gap-analysis
 * @desc    Analyze skills gap for organization/department
 * @access  Private (Admin, HR Manager)
 */
router.post(
  '/skills-gap-analysis',
  requirePermission('analytics:manage'),
  aiController.analyzeSkillsGap
);

/**
 * @route   POST /api/v1/ai/recommend-learning/:employeeId
 * @desc    Get personalized learning recommendations
 * @access  Private (HR, Manager, Self)
 */
router.post(
  '/recommend-learning/:employeeId',
  requirePermission('learning:view'),
  aiController.recommendLearningPath
);

// =====================================================
// CHATBOT
// =====================================================

/**
 * @route   POST /api/v1/ai/chat
 * @desc    Send message to AI chatbot
 * @access  Private (All authenticated users)
 */
router.post('/chat', aiController.chat);

/**
 * @route   GET /api/v1/ai/chat/history/:conversationId
 * @desc    Get chat conversation history
 * @access  Private (All authenticated users)
 */
router.get('/chat/history/:conversationId', aiController.getChatHistory);

// =====================================================
// CONFIGURATION & USAGE
// =====================================================

/**
 * @route   GET /api/v1/ai/config
 * @desc    Get AI configuration for organization
 * @access  Private (Admin)
 */
router.get(
  '/config',
  requirePermission('settings:view'),
  aiController.getAIConfig
);

/**
 * @route   PUT /api/v1/ai/config
 * @desc    Update AI configuration
 * @access  Private (Admin)
 */
router.put(
  '/config',
  requirePermission('settings:manage'),
  aiController.updateAIConfig
);

/**
 * @route   GET /api/v1/ai/usage-stats
 * @desc    Get AI usage statistics and costs
 * @access  Private (Admin)
 */
router.get(
  '/usage-stats',
  requirePermission('analytics:view'),
  aiController.getUsageStats
);

export default router;
