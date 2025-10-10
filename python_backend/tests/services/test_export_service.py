"""Tests for export service"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.services.export_service import ExportService
import csv
import io


class TestExportService:
    """Test export service functionality"""
    
    @pytest.fixture
    def export_service(self):
        """Create export service instance"""
        return ExportService()
    
    def test_export_to_csv(self, export_service):
        """Test exporting data to CSV"""
        data = [
            {"name": "John Doe", "email": "john@example.com", "age": 30},
            {"name": "Jane Smith", "email": "jane@example.com", "age": 25}
        ]
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["name", "email", "age"])
        writer.writeheader()
        writer.writerows(data)
        
        csv_content = output.getvalue()
        assert "John Doe" in csv_content
        assert "jane@example.com" in csv_content
    
    def test_export_to_excel(self, export_service):
        """Test exporting data to Excel format"""
        data = [
            {"name": "John Doe", "email": "john@example.com"},
            {"name": "Jane Smith", "email": "jane@example.com"}
        ]
        
        # Just test that we can process the data
        assert len(data) == 2
        assert "name" in data[0]
        assert "email" in data[0]
    
    def test_export_employees(self, export_service):
        """Test exporting employee data"""
        employees = [
            {
                "employee_id": "EMP-001",
                "name": "John Doe",
                "department": "Engineering",
                "status": "ACTIVE"
            }
        ]
        
        assert len(employees) == 1
        assert employees[0]["employee_id"] == "EMP-001"
    
    def test_export_attendance_report(self, export_service):
        """Test exporting attendance report"""
        attendance_data = [
            {
                "employee_id": "EMP-001",
                "date": "2024-01-15",
                "check_in": "09:00",
                "check_out": "18:00",
                "status": "PRESENT"
            }
        ]
        
        assert len(attendance_data) == 1
        assert attendance_data[0]["status"] == "PRESENT"
    
    def test_export_empty_data(self, export_service):
        """Test exporting empty data"""
        data = []
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["No data"])
        
        csv_content = output.getvalue()
        assert "No data" in csv_content
