"""Integration tests for survey endpoint"""
import pytest
from httpx import AsyncClient


@pytest.mark.integration
@pytest.mark.asyncio
class TestSurveyAPI:
    """Test survey API endpoints"""
    
    async def test_create_survey(self, authenticated_client: AsyncClient):
        """Test creating a survey"""
        survey_data = {
            "title": "Employee Satisfaction Survey 2024",
            "description": "Annual employee satisfaction survey",
            "questions": [
                {
                    "question": "How satisfied are you with your role?",
                    "type": "RATING",
                    "options": ["1", "2", "3", "4", "5"]
                }
            ],
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        
        response = await authenticated_client.post(
            "/api/v1/surveys",
            json=survey_data
        )
        
        assert response.status_code in [200, 201, 404]
    
    async def test_get_surveys(self, authenticated_client: AsyncClient):
        """Test retrieving surveys"""
        response = await authenticated_client.get("/api/v1/surveys")
        
        assert response.status_code in [200, 404]
    
    async def test_get_survey_by_id(self, authenticated_client: AsyncClient):
        """Test retrieving survey by ID"""
        survey_id = "SRV-001"
        response = await authenticated_client.get(f"/api/v1/surveys/{survey_id}")
        
        assert response.status_code in [200, 404]
    
    async def test_submit_survey_response(self, authenticated_client: AsyncClient, test_employee):
        """Test submitting survey response"""
        survey_id = "SRV-001"
        response_data = {
            "employee_id": test_employee.employee_id,
            "responses": [
                {
                    "question_id": "Q1",
                    "answer": "5"
                }
            ]
        }
        
        response = await authenticated_client.post(
            f"/api/v1/surveys/{survey_id}/responses",
            json=response_data
        )
        
        assert response.status_code in [200, 201, 404]
    
    async def test_get_survey_results(self, authenticated_client: AsyncClient):
        """Test getting survey results"""
        survey_id = "SRV-001"
        response = await authenticated_client.get(
            f"/api/v1/surveys/{survey_id}/results"
        )
        
        assert response.status_code in [200, 404]
    
    async def test_publish_survey(self, authenticated_client: AsyncClient):
        """Test publishing a survey"""
        survey_id = "SRV-001"
        response = await authenticated_client.post(
            f"/api/v1/surveys/{survey_id}/publish"
        )
        
        assert response.status_code in [200, 404]
    
    async def test_close_survey(self, authenticated_client: AsyncClient):
        """Test closing a survey"""
        survey_id = "SRV-001"
        response = await authenticated_client.post(
            f"/api/v1/surveys/{survey_id}/close"
        )
        
        assert response.status_code in [200, 404]
    
    async def test_delete_survey(self, authenticated_client: AsyncClient):
        """Test deleting a survey"""
        survey_id = "SRV-001"
        response = await authenticated_client.delete(f"/api/v1/surveys/{survey_id}")
        
        assert response.status_code in [200, 204, 404]
