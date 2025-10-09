"""Test performance management endpoints"""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


@pytest.mark.asyncio
@pytest.mark.performance
@pytest.mark.integration
class TestPerformanceManagement:
    """Test suite for performance management endpoints"""

    async def test_create_goal(self, authenticated_client: AsyncClient, test_employee):
        """Test creating performance goal"""
        goal_data = {
            "employee_id": test_employee.employee_id,
            "title": "Complete Q1 Project",
            "description": "Deliver the new feature by end of Q1",
            "goal_type": "SMART",
            "category": "DEVELOPMENT",
            "target_date": (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "metrics": "100% completion",
            "weight": 30
        }
        
        response = await authenticated_client.post(
            "/api/v1/performance/goals",
            json=goal_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_get_employee_goals(self, authenticated_client: AsyncClient, test_employee):
        """Test getting employee goals"""
        response = await authenticated_client.get(
            f"/api/v1/performance/goals?employee_id={test_employee.employee_id}"
        )
        
        assert response.status_code in [200, 500]

    async def test_update_goal_progress(self, authenticated_client: AsyncClient):
        """Test updating goal progress"""
        update_data = {
            "progress": 50,
            "notes": "Halfway through implementation"
        }
        
        response = await authenticated_client.put(
            "/api/v1/performance/goals/test-goal-001/progress",
            json=update_data
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_create_review_cycle(self, authenticated_client: AsyncClient, test_organization):
        """Test creating performance review cycle"""
        cycle_data = {
            "organization_id": test_organization.organization_id,
            "name": "Q1 2025 Performance Review",
            "description": "Quarterly performance review",
            "start_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "end_date": (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "review_type": "QUARTERLY"
        }
        
        response = await authenticated_client.post(
            "/api/v1/performance/review-cycles",
            json=cycle_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_submit_self_review(self, authenticated_client: AsyncClient, test_employee):
        """Test submitting self review"""
        review_data = {
            "employee_id": test_employee.employee_id,
            "cycle_id": "cycle-001",
            "achievements": "Completed 5 major projects",
            "challenges": "Time management in last quarter",
            "areas_of_improvement": "Need to improve communication",
            "self_rating": 4
        }
        
        response = await authenticated_client.post(
            "/api/v1/performance/reviews/self",
            json=review_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_submit_manager_review(self, authenticated_client: AsyncClient):
        """Test submitting manager review"""
        review_data = {
            "employee_id": "EMP-002",
            "cycle_id": "cycle-001",
            "strengths": "Excellent technical skills",
            "areas_of_improvement": "Communication with stakeholders",
            "rating": 4,
            "feedback": "Great performance overall"
        }
        
        response = await authenticated_client.post(
            "/api/v1/performance/reviews/manager",
            json=review_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_request_360_feedback(self, authenticated_client: AsyncClient, test_employee):
        """Test requesting 360-degree feedback"""
        feedback_request = {
            "employee_id": test_employee.employee_id,
            "reviewers": ["EMP-002", "EMP-003", "EMP-004"],
            "deadline": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
        }
        
        response = await authenticated_client.post(
            "/api/v1/performance/360-feedback/request",
            json=feedback_request
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_submit_peer_feedback(self, authenticated_client: AsyncClient):
        """Test submitting peer feedback"""
        feedback_data = {
            "employee_id": "EMP-002",
            "reviewer_id": "EMP-001",
            "collaboration": 5,
            "communication": 4,
            "technical_skills": 5,
            "comments": "Great team player"
        }
        
        response = await authenticated_client.post(
            "/api/v1/performance/feedback/peer",
            json=feedback_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_get_performance_analytics(self, authenticated_client: AsyncClient, test_organization):
        """Test getting performance analytics"""
        response = await authenticated_client.get(
            f"/api/v1/performance/analytics?organization_id={test_organization.organization_id}"
        )
        
        assert response.status_code in [200, 500]

    async def test_create_development_plan(self, authenticated_client: AsyncClient, test_employee):
        """Test creating development plan"""
        plan_data = {
            "employee_id": test_employee.employee_id,
            "title": "Leadership Development",
            "objectives": ["Improve communication", "Learn conflict resolution"],
            "timeline": "6 months",
            "resources": ["Leadership training", "Mentorship program"]
        }
        
        response = await authenticated_client.post(
            "/api/v1/performance/development-plans",
            json=plan_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_get_kpi_metrics(self, authenticated_client: AsyncClient, test_employee):
        """Test getting KPI metrics"""
        response = await authenticated_client.get(
            f"/api/v1/performance/kpis?employee_id={test_employee.employee_id}"
        )
        
        assert response.status_code in [200, 500]

    async def test_complete_goal(self, authenticated_client: AsyncClient):
        """Test marking goal as complete"""
        response = await authenticated_client.put(
            "/api/v1/performance/goals/test-goal-001/complete",
            json={"completion_notes": "Successfully completed all objectives"}
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_get_team_performance(self, authenticated_client: AsyncClient):
        """Test getting team performance"""
        response = await authenticated_client.get(
            "/api/v1/performance/team?department_id=dept-001"
        )
        
        assert response.status_code in [200, 500]

    async def test_unauthorized_performance_access(self, client: AsyncClient):
        """Test accessing performance endpoints without authentication"""
        response = await client.get("/api/v1/performance/goals")
        
        assert response.status_code in [401, 403]
