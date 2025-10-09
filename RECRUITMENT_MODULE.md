# Recruitment Module Documentation

## Overview

The Recruitment Module provides a complete Applicant Tracking System (ATS) for managing the entire recruitment lifecycle from job posting to offer acceptance and onboarding.

## Features

- ✅ Job posting management
- ✅ Candidate management and tracking
- ✅ Application tracking with pipeline stages
- ✅ Interview scheduling and feedback
- ✅ Offer management
- ✅ Recruitment pipeline analytics
- ✅ Integration with job boards (LinkedIn, Indeed, Glassdoor)
- ✅ Integration with Zoom for video interviews
- ✅ Multi-company support
- ✅ Role-based access control

## Architecture

### Models

The recruitment module consists of 6 main models:

1. **JobPosting**: Job requisitions and postings
2. **Candidate**: Candidate profiles and information
3. **Application**: Job applications linking candidates to jobs
4. **Interview**: Interview scheduling and feedback
5. **Offer**: Job offers and acceptance tracking
6. **RecruitmentPipeline**: Customizable recruitment stages

### Database Schema

```sql
-- Job Postings
CREATE TABLE job_postings (
    job_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    company_id UUID NOT NULL,
    department_id UUID,
    job_title VARCHAR(255) NOT NULL,
    job_code VARCHAR(50) UNIQUE,
    job_description TEXT NOT NULL,
    requirements TEXT,
    responsibilities TEXT,
    employment_type VARCHAR(20) NOT NULL,
    number_of_positions INTEGER DEFAULT 1,
    experience_required VARCHAR(100),
    education_required VARCHAR(255),
    salary_min NUMERIC(15,2),
    salary_max NUMERIC(15,2),
    salary_currency VARCHAR(3) DEFAULT 'USD',
    required_skills TEXT[],
    preferred_skills TEXT[],
    location VARCHAR(255),
    remote_allowed BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'draft',
    posted_date TIMESTAMP,
    closing_date TIMESTAMP,
    hiring_manager_id UUID,
    recruiter_id UUID,
    is_internal BOOLEAN DEFAULT FALSE,
    is_external BOOLEAN DEFAULT TRUE,
    is_urgent BOOLEAN DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP
);

-- Candidates
CREATE TABLE candidates (
    candidate_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    current_company VARCHAR(255),
    current_designation VARCHAR(255),
    current_location VARCHAR(255),
    total_experience_years FLOAT,
    notice_period_days INTEGER,
    current_ctc NUMERIC(15,2),
    expected_ctc NUMERIC(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    skills TEXT[],
    highest_education VARCHAR(255),
    certifications TEXT[],
    resume_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    source VARCHAR(100),
    referred_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP
);

-- Applications
CREATE TABLE applications (
    application_id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES job_postings(job_id),
    candidate_id UUID NOT NULL REFERENCES candidates(candidate_id),
    organization_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'new',
    applied_date TIMESTAMP DEFAULT NOW(),
    cover_letter TEXT,
    screening_score INTEGER,
    screening_notes TEXT,
    screened_by UUID,
    screened_at TIMESTAMP,
    assignment_sent BOOLEAN DEFAULT FALSE,
    assignment_submitted BOOLEAN DEFAULT FALSE,
    assignment_score INTEGER,
    overall_rating INTEGER,
    current_stage VARCHAR(100),
    rejection_reason TEXT,
    rejected_at TIMESTAMP,
    rejected_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP
);

-- Interviews
CREATE TABLE interviews (
    interview_id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(application_id),
    organization_id UUID NOT NULL,
    interview_round VARCHAR(100) NOT NULL,
    interview_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    scheduled_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location VARCHAR(255),
    meeting_link VARCHAR(500),
    meeting_id VARCHAR(255),
    interviewer_ids UUID[],
    panel_lead_id UUID,
    interview_notes TEXT,
    questions_template TEXT,
    technical_rating INTEGER,
    communication_rating INTEGER,
    cultural_fit_rating INTEGER,
    overall_rating INTEGER,
    feedback_text TEXT,
    recommendation VARCHAR(50),
    feedback_submitted_at TIMESTAMP,
    feedback_submitted_by UUID,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP
);

-- Offers
CREATE TABLE offers (
    offer_id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(application_id),
    organization_id UUID NOT NULL,
    company_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    offer_letter_url VARCHAR(500),
    job_title VARCHAR(255) NOT NULL,
    department_id UUID,
    reporting_to UUID,
    employment_type VARCHAR(20),
    start_date DATE,
    annual_ctc NUMERIC(15,2) NOT NULL,
    base_salary NUMERIC(15,2),
    bonus NUMERIC(15,2),
    other_allowances NUMERIC(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    benefits TEXT[],
    offer_date TIMESTAMP,
    valid_until TIMESTAMP,
    responded_at TIMESTAMP,
    response_notes TEXT,
    actual_joining_date DATE,
    created_by UUID,
    approved_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP
);
```

## API Endpoints

### Job Postings

#### Create Job Posting
```http
POST /api/v1/recruitment/jobs
Authorization: Bearer {token}
Content-Type: application/json

{
  "company_id": "uuid",
  "department_id": "uuid",
  "job_title": "Senior Python Developer",
  "job_description": "We are looking for...",
  "requirements": "5+ years of Python experience...",
  "responsibilities": "Design and develop...",
  "employment_type": "full_time",
  "number_of_positions": 2,
  "experience_required": "5-8 years",
  "education_required": "Bachelor's in Computer Science",
  "salary_min": 80000,
  "salary_max": 120000,
  "salary_currency": "USD",
  "required_skills": ["Python", "FastAPI", "PostgreSQL"],
  "preferred_skills": ["Docker", "Kubernetes"],
  "location": "Dubai, UAE",
  "remote_allowed": true,
  "is_urgent": false
}

Response:
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "job_code": "JOB-20240101-abc123",
    "job_title": "Senior Python Developer",
    "status": "draft",
    ...
  },
  "message": "Job posting created successfully"
}
```

#### List Job Postings
```http
GET /api/v1/recruitment/jobs?status=published&page=1&limit=10
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "jobs": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

#### Publish Job Posting
```http
POST /api/v1/recruitment/jobs/{job_id}/publish
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Job posting published successfully"
}
```

### Candidates

#### Create Candidate
```http
POST /api/v1/recruitment/candidates
Authorization: Bearer {token}
Content-Type: application/json

{
  "first_name": "Ahmed",
  "last_name": "Hassan",
  "email": "ahmed.hassan@example.com",
  "phone": "+971501234567",
  "current_company": "Tech Corp",
  "current_designation": "Senior Developer",
  "current_location": "Dubai, UAE",
  "total_experience_years": 6.5,
  "notice_period_days": 30,
  "current_ctc": 180000,
  "expected_ctc": 220000,
  "currency": "AED",
  "skills": ["Python", "FastAPI", "React", "PostgreSQL"],
  "highest_education": "Bachelor's in Computer Science",
  "linkedin_url": "https://linkedin.com/in/ahmedhassan",
  "source": "linkedin"
}

Response:
{
  "success": true,
  "data": {
    "candidate_id": "uuid",
    "first_name": "Ahmed",
    "last_name": "Hassan",
    ...
  },
  "message": "Candidate created successfully"
}
```

#### List Candidates
```http
GET /api/v1/recruitment/candidates?search=ahmed&page=1&limit=10
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "candidates": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

### Applications

#### Create Application
```http
POST /api/v1/recruitment/applications
Authorization: Bearer {token}
Content-Type: application/json

{
  "job_id": "uuid",
  "candidate_id": "uuid",
  "cover_letter": "I am excited to apply for..."
}

Response:
{
  "success": true,
  "data": {
    "application_id": "uuid",
    "job_id": "uuid",
    "candidate_id": "uuid",
    "status": "new",
    "applied_date": "2024-01-15T10:30:00Z",
    "current_stage": "New"
  },
  "message": "Application submitted successfully"
}
```

#### List Applications
```http
GET /api/v1/recruitment/applications?job_id=uuid&status=shortlisted&page=1&limit=10
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "applications": [...],
    "pagination": {...}
  }
}
```

#### Update Application (Screening)
```http
PUT /api/v1/recruitment/applications/{application_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "shortlisted",
  "screening_score": 85,
  "screening_notes": "Strong technical background, good communication",
  "current_stage": "Shortlisted"
}

Response:
{
  "success": true,
  "data": {...},
  "message": "Application updated successfully"
}
```

#### Shortlist Application
```http
POST /api/v1/recruitment/applications/{application_id}/shortlist
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Application shortlisted successfully"
}
```

### Interviews

#### Schedule Interview
```http
POST /api/v1/recruitment/interviews
Authorization: Bearer {token}
Content-Type: application/json

{
  "application_id": "uuid",
  "interview_round": "Technical Round 1",
  "interview_type": "video",
  "scheduled_date": "2024-01-20T14:00:00Z",
  "duration_minutes": 60,
  "meeting_link": "https://zoom.us/j/123456789",
  "interviewer_ids": ["uuid1", "uuid2"],
  "panel_lead_id": "uuid1",
  "interview_notes": "Focus on Python and FastAPI"
}

Response:
{
  "success": true,
  "data": {
    "interview_id": "uuid",
    "application_id": "uuid",
    "interview_round": "Technical Round 1",
    "status": "scheduled",
    "scheduled_date": "2024-01-20T14:00:00Z",
    ...
  },
  "message": "Interview scheduled successfully"
}
```

#### Submit Interview Feedback
```http
POST /api/v1/recruitment/interviews/{interview_id}/feedback
Authorization: Bearer {token}
Content-Type: application/json

{
  "technical_rating": 4,
  "communication_rating": 5,
  "cultural_fit_rating": 4,
  "overall_rating": 4,
  "feedback_text": "Candidate demonstrated strong technical skills...",
  "recommendation": "hire"
}

Response:
{
  "success": true,
  "message": "Interview feedback submitted successfully"
}
```

### Offers

#### Create Offer
```http
POST /api/v1/recruitment/offers
Authorization: Bearer {token}
Content-Type: application/json

{
  "application_id": "uuid",
  "company_id": "uuid",
  "job_title": "Senior Python Developer",
  "department_id": "uuid",
  "reporting_to": "uuid",
  "employment_type": "full_time",
  "start_date": "2024-02-01",
  "annual_ctc": 220000,
  "base_salary": 180000,
  "bonus": 30000,
  "other_allowances": 10000,
  "currency": "AED",
  "benefits": ["Health Insurance", "Annual Leave", "Relocation Assistance"],
  "valid_until": "2024-01-30T23:59:59Z"
}

Response:
{
  "success": true,
  "data": {
    "offer_id": "uuid",
    "application_id": "uuid",
    "status": "draft",
    "job_title": "Senior Python Developer",
    "annual_ctc": 220000,
    ...
  },
  "message": "Offer created successfully"
}
```

### Pipeline Analytics

#### Get Recruitment Pipeline
```http
GET /api/v1/recruitment/pipeline
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "pipeline": {
      "new": 25,
      "screening": 15,
      "shortlisted": 10,
      "interviewing": 8,
      "offered": 3,
      "hired": 2,
      "rejected": 12
    },
    "total_applications": 75
  }
}
```

## Application Status Flow

```
NEW → SCREENING → SHORTLISTED → INTERVIEWING → OFFERED → HIRED
  ↓        ↓           ↓              ↓           ↓
  →→→→→→→→→→→→→→→ REJECTED ←←←←←←←←←←←←←←←
                      ↓
                  WITHDRAWN
```

## Interview Types

- `phone_screen`: Initial phone screening
- `video`: Video interview (Zoom, Teams, etc.)
- `in_person`: Face-to-face interview
- `technical`: Technical assessment
- `hr`: HR interview
- `managerial`: Manager interview
- `panel`: Panel interview

## Interview Recommendations

- `strong_hire`: Strong positive recommendation
- `hire`: Positive recommendation
- `maybe`: Neutral/unsure
- `no_hire`: Negative recommendation
- `strong_no_hire`: Strong negative recommendation

## Integration with Other Modules

### Job Boards Integration
```python
from app.services.job_board_service import JobBoardService

# Post job to LinkedIn
await job_board_service.post_to_linkedin(
    job_posting_id=job_id,
    board_id=linkedin_board_id
)

# Sync applicants from LinkedIn
await job_board_service.sync_applicants(
    board_id=linkedin_board_id,
    job_posting_id=job_id
)
```

### Zoom Integration
```python
from app.services.zoom_service import ZoomService

# Create interview meeting
meeting = await zoom_service.create_meeting(
    account_id=zoom_account_id,
    topic=f"Interview: {candidate_name}",
    start_time=interview_date,
    duration=60
)

# Update interview with meeting link
interview.meeting_link = meeting['join_url']
interview.meeting_id = meeting['id']
```

## Events

The recruitment module emits the following events:

- `job.created`: When a job posting is created
- `job.published`: When a job is published
- `application.received`: When an application is submitted
- `interview.scheduled`: When an interview is scheduled
- `offer.made`: When an offer is created

These events can be used for:
- Email notifications
- Slack notifications
- Workflow automation
- Analytics tracking

## Best Practices

### Job Posting
1. Always include clear job requirements and responsibilities
2. Set realistic salary ranges
3. Use specific, searchable skills
4. Include location and remote work policy

### Candidate Screening
1. Screen applications within 48 hours
2. Use consistent scoring criteria (0-100)
3. Document screening notes for audit trail
4. Move candidates through stages promptly

### Interview Process
1. Schedule interviews at least 3 days in advance
2. Provide interview notes to interviewers beforehand
3. Collect feedback within 24 hours of interview
4. Use consistent rating scales (1-5)

### Offer Management
1. Extend offers within 48 hours of final interview
2. Set realistic validity periods (7-14 days)
3. Include all benefits in offer details
4. Track offer acceptance/rejection

## Security & Privacy

### Data Protection
- All candidate data is encrypted at rest
- PII (Personally Identifiable Information) is protected
- GDPR-compliant data handling
- Right to be forgotten support

### Access Control
- Role-based access control (RBAC)
- Recruiters can manage all recruitment data
- Hiring managers see only their department's jobs
- Interviewers see only assigned interviews

### Audit Trail
- All actions are logged
- Modification history tracked
- User actions attributed
- Compliance-ready reports

## Testing

### Unit Tests
```python
import pytest
from app.api.v1.endpoints.recruitment import create_job_posting

@pytest.mark.asyncio
async def test_create_job_posting():
    # Test job posting creation
    job_data = JobPostingCreate(...)
    result = await create_job_posting(job_data, db, current_user)
    assert result.success == True
    assert result.data['job_title'] == "Senior Python Developer"
```

### Integration Tests
```python
@pytest.mark.asyncio
async def test_recruitment_workflow():
    # Create job
    job = await create_job_posting(...)
    
    # Create candidate
    candidate = await create_candidate(...)
    
    # Create application
    application = await create_application(...)
    
    # Schedule interview
    interview = await schedule_interview(...)
    
    # Submit feedback
    feedback = await submit_interview_feedback(...)
    
    # Create offer
    offer = await create_offer(...)
    
    assert offer.data['status'] == 'draft'
```

## Migration from Legacy System

If migrating from an existing recruitment system:

1. Export candidates CSV with all fields
2. Import candidates using bulk import API
3. Export job postings with status
4. Import job postings
5. Map applications to new system
6. Archive old system data

## Support

For questions or issues:
1. Check this documentation
2. Review API examples in `recruitment.py`
3. Check existing tests in `tests/test_recruitment.py`
4. Create a GitHub issue with label "recruitment"

## Roadmap

Future enhancements:
- [ ] AI-powered candidate matching
- [ ] Automated resume parsing
- [ ] Video interview recording and playback
- [ ] Reference check automation
- [ ] Background verification integration
- [ ] Candidate portal for self-service
- [ ] Mobile app for on-the-go recruitment
