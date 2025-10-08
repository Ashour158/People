import axios from './axios';

// =====================================================
// AI API CLIENT
// =====================================================

export const aiApi = {
  // Resume Parsing
  parseResume: (data: { fileContent: string; fileName: string }) =>
    axios.post('/ai/parse-resume', data),

  getParsedResumes: (params?: any) =>
    axios.get('/ai/parsed-resumes', { params }),

  // Candidate Matching
  matchCandidates: (data: { jobRequirements: any; candidates: any[] }) =>
    axios.post('/ai/match-candidates', data),

  // Attrition Prediction
  predictAttrition: (employeeId: string) =>
    axios.post(`/ai/attrition-risk/${employeeId}`),

  getAttritionRisks: (params?: { riskLevel?: string; departmentId?: string }) =>
    axios.get('/ai/attrition-risk', { params }),

  // Performance Prediction
  predictPerformance: (employeeId: string) =>
    axios.post(`/ai/predict-performance/${employeeId}`),

  // Sentiment Analysis
  analyzeSentiment: (data: {
    text: string;
    sourceType: string;
    sourceId: string;
    employeeId?: string;
  }) => axios.post('/ai/analyze-sentiment', data),

  getSentimentTrends: (params?: {
    period?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }) => axios.get('/ai/sentiment-trends', { params }),

  // Skills Analysis
  analyzeSkillsGap: (data: { scope: string; departmentId?: string }) =>
    axios.post('/ai/skills-gap-analysis', data),

  recommendLearningPath: (employeeId: string) =>
    axios.post(`/ai/recommend-learning/${employeeId}`),

  // Chatbot
  sendChatMessage: (data: {
    conversationId: string;
    message: string;
    context?: any;
  }) => axios.post('/ai/chat', data),

  getChatHistory: (conversationId: string) =>
    axios.get(`/ai/chat/history/${conversationId}`),

  // Configuration & Usage
  getAIConfig: () => axios.get('/ai/config'),

  updateAIConfig: (data: any) => axios.put('/ai/config', data),

  getUsageStats: (params?: { startDate?: string; endDate?: string }) =>
    axios.get('/ai/usage-stats', { params }),
};

export default aiApi;
