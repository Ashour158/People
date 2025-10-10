"""Unit tests for utility functions"""
import pytest
from datetime import datetime, timedelta
from app.utils.pagination import Pagination
from app.utils.response import success_response, error_response


class TestDateTimeUtils:
    """Test datetime utility functions"""
    
    def test_get_current_timestamp(self):
        """Test getting current timestamp"""
        timestamp = datetime.utcnow()
        assert isinstance(timestamp, datetime)
    
    def test_date_range_calculation(self):
        """Test date range calculations"""
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 1, 31)
        delta = end_date - start_date
        assert delta.days == 30
    
    def test_format_datetime(self):
        """Test datetime formatting"""
        dt = datetime(2024, 1, 15, 10, 30, 0)
        formatted = dt.strftime("%Y-%m-%d %H:%M:%S")
        assert formatted == "2024-01-15 10:30:00"
    
    def test_parse_datetime(self):
        """Test datetime parsing"""
        date_str = "2024-01-15"
        parsed = datetime.strptime(date_str, "%Y-%m-%d")
        assert parsed.year == 2024
        assert parsed.month == 1
        assert parsed.day == 15
    
    def test_timedelta_operations(self):
        """Test timedelta operations"""
        now = datetime.utcnow()
        tomorrow = now + timedelta(days=1)
        assert (tomorrow - now).days == 1


class TestPagination:
    """Test pagination utility"""
    
    def test_pagination_creation(self):
        """Test creating pagination object"""
        pagination = Pagination(page=1, limit=10, total=100)
        assert pagination.page == 1
        assert pagination.limit == 10
        assert pagination.total == 100
    
    def test_pagination_offset(self):
        """Test pagination offset calculation"""
        pagination = Pagination(page=2, limit=10, total=100)
        offset = (pagination.page - 1) * pagination.limit
        assert offset == 10
    
    def test_pagination_total_pages(self):
        """Test total pages calculation"""
        pagination = Pagination(page=1, limit=10, total=95)
        total_pages = (pagination.total + pagination.limit - 1) // pagination.limit
        assert total_pages == 10
    
    def test_pagination_first_page(self):
        """Test first page"""
        pagination = Pagination(page=1, limit=10, total=100)
        assert pagination.page == 1
    
    def test_pagination_last_page(self):
        """Test last page calculation"""
        pagination = Pagination(page=10, limit=10, total=100)
        assert pagination.page == 10


class TestResponseUtils:
    """Test response utility functions"""
    
    def test_success_response(self):
        """Test creating success response"""
        response = success_response(data={"message": "Success"})
        assert response["success"] is True
        assert response["data"]["message"] == "Success"
    
    def test_error_response(self):
        """Test creating error response"""
        response = error_response(message="Error occurred", code="ERROR_CODE")
        assert response["success"] is False
        assert response["error"] == "Error occurred"
        assert response["code"] == "ERROR_CODE"
    
    def test_success_response_with_pagination(self):
        """Test success response with pagination"""
        response = success_response(
            data={"items": []},
            pagination={"page": 1, "limit": 10, "total": 0}
        )
        assert response["success"] is True
        assert "pagination" in response
        assert response["pagination"]["page"] == 1
    
    def test_success_response_empty_data(self):
        """Test success response with empty data"""
        response = success_response(data={})
        assert response["success"] is True
        assert response["data"] == {}
    
    def test_error_response_without_code(self):
        """Test error response without code"""
        response = error_response(message="Error")
        assert response["success"] is False
        assert response["error"] == "Error"
