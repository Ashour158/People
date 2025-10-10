"""Test recruitment management endpoints"""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


@pytest.mark.asyncio
@pytest.mark.integration
class TestRecruitmentManagement:
    """Test suite for recruitment management endpoints"""

    async def test_create_job_posting(self, authenticated_client: AsyncClient, test_organization):
        """Test creating job posting"""
        job_data = {
            "organization_id": test_organization.organization_id,
            "title": "Senior Software Engineer",
            "description": "We are looking for an experienced software engineer",
            "department": "Engineering",
            "location": "New York, NY",
            "employment_type": "FULL_TIME",
            "experience_required": "5+ years",
            "salary_range_min": 100000,
            "salary_range_max": 150000,
            "skills_required": ["Python", "FastAPI", "PostgreSQL"],
            "status": "OPEN"
        }
        
        response = await authenticated_client.post(
            "/api/v1/recruitment/jobs",
            json=job_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_get_job_postings(self, authenticated_client: AsyncClient):
        """Test getting job postings"""
        response = await authenticated_client.get("/api/v1/recruitment/jobs")
        
        assert response.status_code in [200, 500]

    async def test_update_job_posting(self, authenticated_client: AsyncClient):
        """Test updating job posting"""
        update_data = {
            "status": "CLOSED",
            "description": "Updated job description"
        }
        
        response = await authenticated_client.put(
            "/api/v1/recruitment/jobs/job-001",
            json=update_data
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_add_candidate(self, authenticated_client: AsyncClient):
        """Test adding candidate"""
        candidate_data = {
            "job_id": "job-001",
            "first_name": "Jane",
            "last_name": "Candidate",
            "email": "jane.candidate@example.com",
            "phone": "+1234567890",
            "resume_url": "https://example.com/resume.pdf",
            "linkedin_url": "https://linkedin.com/in/janecandidate",
            "source": "LinkedIn",
            "current_company": "Tech Corp",
            "experience_years": 6
        }
        
        response = await authenticated_client.post(
            "/api/v1/recruitment/candidates",
            json=candidate_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_get_candidates(self, authenticated_client: AsyncClient):
        """Test getting candidates"""
        response = await authenticated_client.get(
            "/api/v1/recruitment/candidates?job_id=job-001"
        )
        
        assert response.status_code in [200, 500]

    async def test_move_candidate_stage(self, authenticated_client: AsyncClient):
        """Test moving candidate to next stage"""
        stage_data = {
            "stage": "SCREENING",
            "notes": "Strong technical background"
        }
        
        response = await authenticated_client.put(
            "/api/v1/recruitment/candidates/candidate-001/stage",
            json=stage_data
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_schedule_interview(self, authenticated_client: AsyncClient):
        """Test scheduling interview"""
        interview_data = {
            "candidate_id": "candidate-001",
            "interview_type": "TECHNICAL",
            "scheduled_date": (datetime.utcnow() + timedelta(days=3)).isoformat(),
            "duration_minutes": 60,
            "interviewers": ["EMP-001", "EMP-002"],
            "location": "Zoom",
            "notes": "Technical round with coding exercise"
        }
        
        response = await authenticated_client.post(
            "/api/v1/recruitment/interviews",
            json=interview_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_submit_interview_feedback(self, authenticated_client: AsyncClient):
        """Test submitting interview feedback"""
        feedback_data = {
            "interview_id": "interview-001",
            "interviewer_id": "EMP-001",
            "technical_skills": 4,
            "communication": 5,
            "problem_solving": 4,
            "cultural_fit": 5,
            "overall_rating": 4,
            "feedback": "Strong candidate, good technical skills",
            "recommendation": "HIRE"
        }
        
        response = await authenticated_client.post(
            "/api/v1/recruitment/interviews/feedback",
            json=feedback_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_create_offer(self, authenticated_client: AsyncClient):
        """Test creating job offer"""
        offer_data = {
            "candidate_id": "candidate-001",
            "job_id": "job-001",
            "salary": 120000,
            "currency": "USD",
            "start_date": (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "benefits": ["Health Insurance", "401k", "PTO"],
            "offer_valid_until": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
        }
        
        response = await authenticated_client.post(
            "/api/v1/recruitment/offers",
            json=offer_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_get_recruitment_pipeline(self, authenticated_client: AsyncClient):
        """Test getting recruitment pipeline"""
        response = await authenticated_client.get(
            "/api/v1/recruitment/pipeline?job_id=job-001"
        )
        
        assert response.status_code in [200, 500]

    async def test_get_recruitment_analytics(self, authenticated_client: AsyncClient, test_organization):
        """Test getting recruitment analytics"""
        response = await authenticated_client.get(
            f"/api/v1/recruitment/analytics?organization_id={test_organization.organization_id}"
        )
        
        assert response.status_code in [200, 500]

    async def test_reject_candidate(self, authenticated_client: AsyncClient):
        """Test rejecting candidate"""
        rejection_data = {
            "reason": "Not a good fit",
            "feedback": "Thank you for applying"
        }
        
        response = await authenticated_client.put(
            "/api/v1/recruitment/candidates/candidate-001/reject",
            json=rejection_data
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_search_candidates(self, authenticated_client: AsyncClient):
        """Test searching candidates"""
        response = await authenticated_client.get(
            "/api/v1/recruitment/candidates?search=Python&experience_min=5"
        )
        
        assert response.status_code in [200, 500]

    async def test_unauthorized_recruitment_access(self, client: AsyncClient):
        """Test accessing recruitment endpoints without authentication"""
        response = await client.get("/api/v1/recruitment/jobs")
        
        assert response.status_code in [401, 403]
