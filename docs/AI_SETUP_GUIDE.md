# AI/ML Integration Guide

## Overview

The People HR Management System includes comprehensive AI and Machine Learning capabilities to enhance HR operations with intelligent automation, predictive analytics, and data-driven insights.

## Features

### 1. Resume Parsing
- **Description**: Automatically extract structured information from resumes
- **Use Case**: Recruitment teams can quickly process candidate resumes
- **API**: `POST /api/v1/ai/parse-resume`
- **Frontend**: Resume upload component with automatic parsing

### 2. Candidate Matching
- **Description**: AI-powered job-candidate matching with scoring
- **Use Case**: Identify best-fit candidates for open positions
- **API**: `POST /api/v1/ai/match-candidates`
- **Frontend**: Candidate ranking dashboard

### 3. Attrition Prediction
- **Description**: Predict employee turnover risk using ML models
- **Use Case**: Proactively retain high-value employees
- **API**: `POST /api/v1/ai/attrition-risk/:employeeId`
- **Frontend**: Attrition dashboard with risk levels and recommendations

### 4. Performance Prediction
- **Description**: Forecast employee performance trends
- **Use Case**: Identify high-potential employees and performance issues early
- **API**: `POST /api/v1/ai/predict-performance/:employeeId`
- **Frontend**: Performance insights dashboard

### 5. Sentiment Analysis
- **Description**: Analyze employee feedback and survey responses
- **Use Case**: Understand employee sentiment and identify concerns
- **API**: `POST /api/v1/ai/analyze-sentiment`
- **Frontend**: Sentiment trends visualization

### 6. Skills Gap Analysis
- **Description**: Identify organizational skill gaps
- **Use Case**: Plan training programs and hiring needs
- **API**: `POST /api/v1/ai/skills-gap-analysis`
- **Frontend**: Skills inventory and gap reports

### 7. Learning Recommendations
- **Description**: Personalized learning path suggestions
- **Use Case**: Employee development and career growth
- **API**: `POST /api/v1/ai/recommend-learning/:employeeId`
- **Frontend**: Learning recommendations page

### 8. AI Chatbot
- **Description**: Virtual HR assistant for employees
- **Use Case**: Answer HR questions 24/7
- **API**: `POST /api/v1/ai/chat`
- **Frontend**: Chat interface component

## Setup Instructions

### Backend Setup

1. **Install Dependencies**:
```bash
cd backend
npm install
```

2. **Configure Environment Variables**:
```bash
# Add to .env file
AI_ENABLED=true
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4-turbo
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7

# Feature Flags
AI_RESUME_PARSING_ENABLED=true
AI_CANDIDATE_MATCHING_ENABLED=true
AI_ATTRITION_PREDICTION_ENABLED=true
AI_PERFORMANCE_PREDICTION_ENABLED=true
AI_SENTIMENT_ANALYSIS_ENABLED=true
AI_CHATBOT_ENABLED=true
AI_SKILLS_ANALYSIS_ENABLED=true

# Rate Limits
AI_RATE_LIMIT_PER_HOUR=100
AI_RATE_LIMIT_PER_DAY=1000

# Cache Settings
AI_CACHE_ENABLED=true
AI_CACHE_TTL=86400
```

3. **Run Database Migrations**:
```bash
psql your_database < database/ai_ml_schema.sql
```

4. **Start Backend Server**:
```bash
npm run dev
```

### Frontend Setup

1. **Install Dependencies**:
```bash
cd frontend
npm install
```

2. **Configure API Base URL**:
```bash
# Add to .env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

3. **Start Frontend**:
```bash
npm run dev
```

## Usage Examples

### Resume Parsing

```typescript
import { aiApi } from './api/ai.api';

const parseResume = async (fileContent: string, fileName: string) => {
  try {
    const result = await aiApi.parseResume({ fileContent, fileName });
    console.log('Parsed Resume:', result.data);
    // Access: result.data.name, result.data.skills, etc.
  } catch (error) {
    console.error('Parsing failed:', error);
  }
};
```

### Attrition Prediction

```typescript
import { aiApi } from './api/ai.api';

const checkAttritionRisk = async (employeeId: string) => {
  try {
    const result = await aiApi.predictAttrition(employeeId);
    console.log('Risk Score:', result.data.riskScore);
    console.log('Risk Level:', result.data.riskLevel);
    console.log('Retention Actions:', result.data.retentionActions);
  } catch (error) {
    console.error('Prediction failed:', error);
  }
};
```

### Sentiment Analysis

```typescript
import { aiApi } from './api/ai.api';

const analyzeFeedback = async (text: string) => {
  try {
    const result = await aiApi.analyzeSentiment({
      text,
      sourceType: 'survey_response',
      sourceId: 'survey-123',
    });
    console.log('Sentiment:', result.data.sentimentCategory);
    console.log('Score:', result.data.sentimentScore);
    console.log('Topics:', result.data.topics);
  } catch (error) {
    console.error('Analysis failed:', error);
  }
};
```

### Chatbot

```typescript
import { aiApi } from './api/ai.api';

const sendMessage = async (conversationId: string, message: string) => {
  try {
    const result = await aiApi.sendChatMessage({
      conversationId,
      message,
      context: { currentPage: 'leave-management' },
    });
    console.log('Bot Reply:', result.data.reply);
  } catch (error) {
    console.error('Chat failed:', error);
  }
};
```

## Configuration Management

### Enable/Disable AI Features

```typescript
import { aiApi } from './api/ai.api';

// Get current configuration
const config = await aiApi.getAIConfig();

// Update configuration
await aiApi.updateAIConfig({
  resumeParsingEnabled: true,
  attritionPredictionEnabled: true,
  monthlyBudgetUsd: 1000,
});
```

### Monitor Usage and Costs

```typescript
import { aiApi } from './api/ai.api';

// Get usage statistics
const stats = await aiApi.getUsageStats({
  startDate: '2025-01-01',
  endDate: '2025-01-31',
});

console.log('Total Requests:', stats.data.summary.totalRequests);
console.log('Total Cost:', stats.data.summary.totalCost);
console.log('Budget Used:', stats.data.summary.budgetUsedPercent);
```

## Best Practices

### 1. Rate Limiting
- Monitor API usage to avoid rate limits
- Implement exponential backoff for retries
- Cache results when appropriate

### 2. Cost Management
- Set monthly budget limits
- Monitor costs regularly
- Use feature flags to control usage
- Cache expensive operations

### 3. Privacy & Compliance
- Ensure user consent before AI analysis
- Anonymize sensitive data
- Follow GDPR and local regulations
- Maintain audit logs

### 4. Data Quality
- Validate AI predictions with human review
- Provide feedback on prediction accuracy
- Update models based on outcomes
- Handle edge cases gracefully

### 5. User Experience
- Show loading states during AI processing
- Provide confidence scores with predictions
- Explain AI recommendations clearly
- Allow users to override AI suggestions

## Troubleshooting

### Common Issues

**1. "AI feature not enabled" error**
- Check organization AI configuration
- Verify feature flags in environment variables
- Ensure admin has enabled the feature

**2. "Rate limit exceeded" error**
- Wait before retrying
- Check rate limit settings
- Consider upgrading plan

**3. "OpenAI API error"**
- Verify API key is correct
- Check API key has sufficient quota
- Ensure network connectivity to OpenAI

**4. High AI costs**
- Review usage patterns
- Enable caching
- Optimize prompts to use fewer tokens
- Consider using smaller models for simple tasks

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

## Testing

### Unit Tests
```bash
npm test -- ai.service.test.ts
```

### Integration Tests
```bash
npm test -- ai.integration.test.ts
```

### Mock AI Service
For testing without API costs, use mock service:
```typescript
// In test files
jest.mock('../services/ai.service');
```

## Performance Optimization

### Caching Strategy
- Enable Redis caching for AI results
- Set appropriate TTL values
- Cache frequently requested predictions
- Invalidate cache when source data changes

### Batch Processing
- Group multiple predictions together
- Process during off-peak hours
- Use queue system for non-urgent requests

### Model Selection
- Use GPT-4 Turbo for complex analysis
- Use GPT-3.5 Turbo for simple queries
- Consider custom models for repetitive tasks

## Monitoring & Analytics

### Key Metrics
- Request count by feature
- Average processing time
- Cost per feature
- Prediction accuracy
- User adoption rates

### Dashboards
- AI Usage Dashboard (`/ai/insights`)
- Attrition Risk Dashboard (`/ai/attrition`)
- Sentiment Trends Dashboard (`/ai/sentiment`)

### Alerts
Set up alerts for:
- Budget threshold exceeded (80%, 90%, 100%)
- High error rates (>5%)
- Slow response times (>5s)
- Critical attrition risks detected

## Roadmap

### Near Term (Q1 2025)
- [ ] Custom ML model training
- [ ] Batch processing API
- [ ] Advanced caching strategies
- [ ] Mobile AI features

### Medium Term (Q2-Q3 2025)
- [ ] Voice-based AI assistant
- [ ] Video interview analysis
- [ ] Document verification AI
- [ ] Automated compliance checks

### Long Term (Q4 2025+)
- [ ] Computer vision for ID verification
- [ ] Real-time collaboration suggestions
- [ ] Generative AI for content creation
- [ ] Advanced workforce planning

## Support

- **Documentation**: See `/docs/AI_ML_INTEGRATION.md`
- **API Reference**: See `/docs/AI_API_REFERENCE.md`
- **GitHub Issues**: https://github.com/Ashour158/People/issues
- **Email**: support@example.com

## License

This AI/ML integration is part of the People HR Management System and follows the same license terms.
