# AI/ML Integration API Reference

## Overview

This document provides detailed API reference for all AI and Machine Learning features in the People HR Management System.

**Base URL**: `/api/v1/ai`

**Authentication**: All endpoints require JWT authentication via Bearer token.

**Rate Limiting**: 
- 100 requests per hour per organization
- 1000 requests per day per organization

---

## Table of Contents

1. [Resume Parsing](#resume-parsing)
2. [Candidate Matching](#candidate-matching)
3. [Attrition Prediction](#attrition-prediction)
4. [Performance Prediction](#performance-prediction)
5. [Sentiment Analysis](#sentiment-analysis)
6. [Skills Analysis](#skills-analysis)
7. [Chatbot](#chatbot)
8. [Configuration & Usage](#configuration--usage)

---

## Resume Parsing

### Parse Resume

Extract structured information from resumes using AI-powered NLP.

**Endpoint**: `POST /api/v1/ai/parse-resume`

**Permissions**: `recruitment:manage`

**Request Body**:
```json
{
  "fileContent": "string (resume text content)",
  "fileName": "resume.pdf"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "parsedResumeId": "uuid",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "location": "New York, USA",
    "summary": "Experienced software engineer with 5 years...",
    "totalExperience": 5.5,
    "skills": [
      {
        "skill": "Python",
        "proficiency": "Expert",
        "years": 5
      }
    ],
    "skillCategories": {
      "technical": ["Python", "JavaScript", "SQL"],
      "soft": ["Leadership", "Communication"],
      "languages": ["English", "Spanish"]
    },
    "workExperience": [
      {
        "company": "Tech Corp",
        "title": "Senior Developer",
        "duration": "Jan 2020 - Present",
        "responsibilities": ["Led team of 5", "Architected solutions"],
        "achievements": ["Reduced costs by 30%"]
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Science",
        "major": "Computer Science",
        "institution": "MIT",
        "year": "2018",
        "gpa": "3.8"
      }
    ],
    "certifications": [
      {
        "name": "AWS Certified Solutions Architect",
        "issuer": "Amazon",
        "date": "2022",
        "expiry": "2025"
      }
    ],
    "languages": [
      {
        "language": "English",
        "proficiency": "Native"
      }
    ],
    "linkedin": "https://linkedin.com/in/johndoe",
    "github": "https://github.com/johndoe",
    "confidence": 92
  },
  "message": "Resume parsed successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields
- `403 Forbidden`: Feature not enabled
- `500 Internal Server Error`: Parsing failed

---

### Get Parsed Resumes

Retrieve list of previously parsed resumes.

**Endpoint**: `GET /api/v1/ai/parsed-resumes`

**Permissions**: `recruitment:view`

**Query Parameters**:
- `page` (integer): Page number (default: 1)
- `limit` (integer): Results per page (default: 10)
- `email` (string): Filter by email
- `dateFrom` (date): Filter from date
- `dateTo` (date): Filter to date

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "resumes": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
  }
}
```

---

## Candidate Matching

### Match Candidates to Job

AI-powered candidate-job matching with scoring.

**Endpoint**: `POST /api/v1/ai/match-candidates`

**Permissions**: `recruitment:manage`

**Request Body**:
```json
{
  "jobRequirements": {
    "title": "Senior Software Engineer",
    "requiredSkills": [
      {
        "skill": "Python",
        "level": "Expert",
        "weight": 0.4
      },
      {
        "skill": "AWS",
        "level": "Intermediate",
        "weight": 0.3
      }
    ],
    "minimumExperience": 5,
    "preferredEducation": "Bachelor's Degree",
    "location": "Remote",
    "jobDescription": "We are looking for..."
  },
  "candidates": [
    {
      "candidateId": "uuid",
      "skills": [...],
      "experience": 6,
      "education": [...]
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "candidateId": "uuid",
      "overallScore": 87,
      "recommendation": "strong_fit",
      "confidence": 92,
      "skillsMatch": 90,
      "experienceMatch": 85,
      "educationMatch": 88,
      "matchedSkills": [
        {
          "skill": "Python",
          "requiredLevel": "Expert",
          "candidateLevel": "Expert",
          "match": true
        }
      ],
      "skillGaps": [
        {
          "skill": "Kubernetes",
          "requiredLevel": "Intermediate",
          "gap": "Needs training"
        }
      ],
      "strengths": [
        "Strong Python expertise",
        "Excellent AWS experience",
        "Leadership background"
      ],
      "concerns": [
        "Limited Kubernetes experience"
      ],
      "interviewFocusAreas": [
        "Cloud architecture",
        "Team leadership"
      ],
      "suggestedQuestions": [
        "Can you describe your experience scaling Python applications?",
        "How have you led distributed teams?"
      ]
    }
  ],
  "message": "Candidates matched successfully"
}
```

---

## Attrition Prediction

### Get Attrition Risks

Get list of employees with high attrition risk.

**Endpoint**: `GET /api/v1/ai/attrition-risk`

**Permissions**: `analytics:view`

**Query Parameters**:
- `riskLevel` (string): Filter by risk level (low, medium, high, critical)
- `departmentId` (uuid): Filter by department
- `page` (integer): Page number
- `limit` (integer): Results per page

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "highRiskEmployees": [
      {
        "employeeId": "uuid",
        "employeeName": "Jane Smith",
        "department": "Engineering",
        "riskScore": 78,
        "riskLevel": "high",
        "predictedExitDate": "2025-06-15",
        "confidence": 85
      }
    ],
    "summary": {
      "critical": 3,
      "high": 12,
      "medium": 25,
      "low": 150
    }
  }
}
```

---

### Predict Employee Attrition Risk

Calculate attrition risk for a specific employee.

**Endpoint**: `POST /api/v1/ai/attrition-risk/:employeeId`

**Permissions**: `analytics:manage`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "employeeId": "uuid",
    "riskScore": 75,
    "riskLevel": "high",
    "confidence": 85,
    "predictedExitDate": "2025-06-15",
    "timeframe": "3-6_months",
    "contributingFactors": [
      {
        "factor": "Salary below market average",
        "weight": 0.35,
        "score": 80,
        "description": "Compensation is 15% below market rate"
      },
      {
        "factor": "No promotion in 3 years",
        "weight": 0.25,
        "score": 70,
        "description": "Career progression has stagnated"
      },
      {
        "factor": "Low engagement scores",
        "weight": 0.20,
        "score": 65,
        "description": "Recent survey shows declining engagement"
      }
    ],
    "riskIndicators": {
      "tenureRisk": 60,
      "performanceRisk": 30,
      "engagementRisk": 80,
      "compensationRisk": 85,
      "careerProgressionRisk": 70
    },
    "retentionActions": [
      {
        "action": "Conduct salary review and adjustment",
        "priority": "high",
        "expectedImpact": "Reduce risk by 25-30%",
        "estimatedCost": 15000,
        "timeline": "Immediate"
      },
      {
        "action": "Create career development plan",
        "priority": "high",
        "expectedImpact": "Reduce risk by 15-20%",
        "estimatedCost": 2000,
        "timeline": "Within 2 weeks"
      },
      {
        "action": "Schedule one-on-one with manager",
        "priority": "immediate",
        "expectedImpact": "Reduce risk by 10%",
        "estimatedCost": 0,
        "timeline": "This week"
      }
    ],
    "talkingPoints": [
      "Acknowledge their contributions and value to the team",
      "Discuss career aspirations and growth opportunities",
      "Address compensation concerns transparently",
      "Explore work-life balance and flexibility needs"
    ],
    "urgency": "soon"
  },
  "message": "Attrition risk calculated"
}
```

---

## Performance Prediction

### Predict Employee Performance

Forecast employee performance for upcoming review period.

**Endpoint**: `POST /api/v1/ai/predict-performance/:employeeId`

**Permissions**: `performance:manage`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "employeeId": "uuid",
    "predictedRating": "good",
    "predictedScore": 82,
    "confidence": 88,
    "trendDirection": "improving",
    "trendStrength": 75,
    "performanceVelocity": 0.15,
    "goalCompletionProbability": [
      {
        "goalId": "uuid",
        "goalName": "Complete project X",
        "probability": 85,
        "concerns": []
      }
    ],
    "performanceFactors": [
      {
        "factor": "Project delivery",
        "impact": 0.35,
        "trend": "improving"
      }
    ],
    "strengths": [
      "Consistent delivery of high-quality work",
      "Strong collaboration with team",
      "Proactive problem solving"
    ],
    "areasForImprovement": [
      "Time management in multi-project scenarios",
      "Documentation practices"
    ],
    "developmentRecommendations": [
      {
        "area": "Leadership",
        "actions": ["Take on mentoring role", "Lead technical initiatives"],
        "priority": "medium"
      }
    ],
    "trainingSuggestions": [
      "Advanced Project Management",
      "Technical Writing Workshop"
    ],
    "mentoringNeeds": false,
    "highPotentialScore": 78,
    "promotionReadiness": "needs_development",
    "successionCandidate": true,
    "predictionForPeriod": "next_quarter"
  },
  "message": "Performance predicted"
}
```

---

## Sentiment Analysis

### Analyze Sentiment

Analyze sentiment of employee feedback or survey responses.

**Endpoint**: `POST /api/v1/ai/analyze-sentiment`

**Permissions**: `analytics:manage`

**Request Body**:
```json
{
  "text": "I really enjoy working here. The team is supportive and the work is challenging.",
  "sourceType": "survey_response",
  "sourceId": "uuid",
  "employeeId": "uuid"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "sentimentScore": 72,
    "sentimentCategory": "positive",
    "confidence": 91,
    "emotions": {
      "joy": 0.75,
      "sadness": 0.05,
      "anger": 0.0,
      "fear": 0.05,
      "surprise": 0.15
    },
    "dominantEmotion": "joy",
    "topics": [
      {
        "topic": "team_dynamics",
        "relevance": 0.9,
        "sentiment": "positive"
      },
      {
        "topic": "work_challenges",
        "relevance": 0.7,
        "sentiment": "positive"
      }
    ],
    "keyPhrases": [
      "enjoy working",
      "supportive team",
      "challenging work"
    ],
    "categories": [
      "work_environment",
      "team_dynamics",
      "job_satisfaction"
    ],
    "intent": "compliment",
    "urgency": "low",
    "requiresAction": false,
    "actionType": "acknowledge",
    "suggestedResponse": "Thank you for sharing your positive experience! We're glad you're finding the work challenging and enjoying the team environment."
  },
  "message": "Sentiment analyzed successfully"
}
```

---

### Get Sentiment Trends

Get sentiment trends over time.

**Endpoint**: `GET /api/v1/ai/sentiment-trends`

**Permissions**: `analytics:view`

**Query Parameters**:
- `period` (string): daily, weekly, monthly, quarterly
- `departmentId` (uuid): Filter by department
- `startDate` (date): Start date
- `endDate` (date): End date

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "period": "2025-01",
        "averageSentiment": 68,
        "sentimentDistribution": {
          "veryPositive": 18,
          "positive": 42,
          "neutral": 28,
          "negative": 10,
          "veryNegative": 2
        },
        "responseCount": 150,
        "sentimentChange": 5,
        "trendDirection": "improving"
      }
    ],
    "topPositiveTopics": [
      {"topic": "work_environment", "count": 85},
      {"topic": "team_collaboration", "count": 72}
    ],
    "topNegativeTopics": [
      {"topic": "workload", "count": 15},
      {"topic": "tools_technology", "count": 12}
    ],
    "emergingIssues": [
      "Remote work challenges",
      "Career development opportunities"
    ]
  }
}
```

---

## Skills Analysis

### Analyze Skills Gap

Analyze skills gap for organization or department.

**Endpoint**: `POST /api/v1/ai/skills-gap-analysis`

**Permissions**: `analytics:manage`

**Request Body**:
```json
{
  "scope": "department",
  "departmentId": "uuid",
  "requiredSkills": [
    {
      "skill": "Kubernetes",
      "requiredLevel": "Intermediate",
      "priority": "high"
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "scope": "department",
    "scopeName": "Engineering",
    "currentSkills": [
      {
        "skill": "Python",
        "proficiencyAvg": 4.2,
        "employeeCount": 25
      }
    ],
    "skillGaps": [
      {
        "skill": "Kubernetes",
        "currentAvg": 2.1,
        "required": 3.5,
        "gapSize": 1.4,
        "impact": "high"
      }
    ],
    "criticalGaps": [
      "Kubernetes",
      "Microservices Architecture"
    ],
    "businessImpact": "high",
    "readinessScore": 72,
    "trainingRecommendations": [
      {
        "skill": "Kubernetes",
        "program": "Kubernetes for Developers",
        "cost": 500,
        "duration": "2 weeks",
        "priority": "high"
      }
    ],
    "estimatedTrainingCost": 12500,
    "estimatedTimelineMonths": 3
  }
}
```

---

### Recommend Learning Path

Get personalized learning recommendations for an employee.

**Endpoint**: `POST /api/v1/ai/recommend-learning/:employeeId`

**Permissions**: `learning:view`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "recommendationId": "uuid",
    "employeeId": "uuid",
    "recommendationType": "skill_gap",
    "priority": "high",
    "recommendedCourses": [
      {
        "courseId": "uuid",
        "courseName": "Advanced Python Programming",
        "provider": "Coursera",
        "duration": "6 weeks",
        "cost": 299
      }
    ],
    "learningPath": [
      {
        "step": 1,
        "course": "Python Fundamentals",
        "duration": "4 weeks"
      },
      {
        "step": 2,
        "course": "Advanced Python",
        "duration": "6 weeks"
      }
    ],
    "targetSkills": [
      {
        "skill": "Python",
        "currentLevel": 3,
        "targetLevel": 5,
        "importance": "high"
      }
    ],
    "expectedBenefits": [
      "Improved code quality",
      "Faster development cycles",
      "Ability to mentor junior developers"
    ],
    "careerImpact": "Enables progression to Senior Developer role",
    "performanceImpact": "Expected 15% improvement in productivity"
  }
}
```

---

## Chatbot

### Send Chat Message

Send message to AI chatbot assistant.

**Endpoint**: `POST /api/v1/ai/chat`

**Permissions**: Authenticated users

**Request Body**:
```json
{
  "conversationId": "uuid",
  "message": "How do I apply for leave?",
  "context": {
    "currentPage": "leave",
    "userRole": "employee"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "reply": "To apply for leave, follow these steps:\n1. Go to Leave Management\n2. Click 'Apply Leave'\n3. Select leave type and dates\n4. Submit for approval\n\nWould you like me to guide you through the process?",
    "processingTime": 1250
  },
  "message": "Message sent successfully"
}
```

---

### Get Chat History

Retrieve conversation history.

**Endpoint**: `GET /api/v1/ai/chat/history/:conversationId`

**Permissions**: Authenticated users

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "messages": [
      {
        "messageType": "user",
        "content": "How do I apply for leave?",
        "timestamp": "2025-01-15T10:30:00Z"
      },
      {
        "messageType": "bot",
        "content": "To apply for leave...",
        "timestamp": "2025-01-15T10:30:02Z"
      }
    ]
  }
}
```

---

## Configuration & Usage

### Get AI Configuration

Get AI configuration for organization.

**Endpoint**: `GET /api/v1/ai/config`

**Permissions**: `settings:view`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "aiProvider": "openai",
    "modelName": "gpt-4-turbo",
    "resumeParsingEnabled": true,
    "candidateMatchingEnabled": true,
    "attritionPredictionEnabled": true,
    "performancePredictionEnabled": false,
    "sentimentAnalysisEnabled": true,
    "chatbotEnabled": true,
    "skillsAnalysisEnabled": true,
    "dailyRequestLimit": 1000,
    "hourlyRequestLimit": 100,
    "monthlyBudgetUsd": 500,
    "anonymizeData": true,
    "requireConsent": true
  }
}
```

---

### Update AI Configuration

Update AI configuration.

**Endpoint**: `PUT /api/v1/ai/config`

**Permissions**: `settings:manage`

**Request Body**:
```json
{
  "resumeParsingEnabled": true,
  "attritionPredictionEnabled": true,
  "monthlyBudgetUsd": 1000
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    ...updated config
  },
  "message": "AI configuration updated"
}
```

---

### Get Usage Statistics

Get AI usage statistics and costs.

**Endpoint**: `GET /api/v1/ai/usage-stats`

**Permissions**: `analytics:view`

**Query Parameters**:
- `startDate` (date): Start date (default: 30 days ago)
- `endDate` (date): End date (default: today)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "featureType": "resume_parsing",
      "requestCount": 125,
      "totalTokens": 250000,
      "totalCost": 5.25,
      "avgProcessingTime": 2500
    },
    {
      "featureType": "attrition_prediction",
      "requestCount": 45,
      "totalTokens": 90000,
      "totalCost": 1.80,
      "avgProcessingTime": 3200
    }
  ],
  "summary": {
    "totalRequests": 350,
    "totalCost": 14.75,
    "totalTokens": 525000,
    "dailyAverage": 11.67,
    "budgetUsedPercent": 15
  }
}
```

---

## Error Handling

All endpoints follow standard error response format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

- `AI_FEATURE_DISABLED`: Feature not enabled for organization
- `AI_RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `AI_BUDGET_EXCEEDED`: Monthly budget exceeded
- `AI_INVALID_INPUT`: Invalid input data
- `AI_PROCESSING_ERROR`: Error during AI processing
- `AI_SERVICE_UNAVAILABLE`: AI service temporarily unavailable

---

## Best Practices

1. **Caching**: AI predictions are cached for 24 hours by default
2. **Batch Processing**: Use batch endpoints for multiple items when available
3. **Rate Limiting**: Monitor usage to avoid rate limit errors
4. **Error Handling**: Implement retry logic with exponential backoff
5. **Privacy**: Ensure user consent before analyzing personal data
6. **Cost Management**: Monitor usage statistics regularly
7. **Validation**: Always validate AI predictions with human review
8. **Feedback Loop**: Provide feedback on prediction accuracy

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/Ashour158/People/issues
- Documentation: See `/docs/AI_ML_INTEGRATION.md`
- Email: support@example.com
