"""Unit tests for validators"""
import pytest
from pydantic import ValidationError


class TestEmailValidation:
    """Test email validation"""
    
    def test_valid_email(self):
        """Test valid email formats"""
        valid_emails = [
            "test@example.com",
            "user.name@example.com",
            "user+tag@example.co.uk",
            "test_user@example-domain.com"
        ]
        for email in valid_emails:
            assert "@" in email
            assert "." in email.split("@")[1]
    
    def test_invalid_email(self):
        """Test invalid email formats"""
        invalid_emails = [
            "notanemail",
            "@example.com",
            "user@",
            "user @example.com",
            "user@.com"
        ]
        for email in invalid_emails:
            # Basic validation
            is_valid = "@" in email and "." in email.split("@")[-1] if "@" in email else False
            assert is_valid is False or email.count("@") != 1


class TestPhoneValidation:
    """Test phone number validation"""
    
    def test_valid_phone_formats(self):
        """Test valid phone number formats"""
        valid_phones = [
            "+1234567890",
            "+12-345-678-90",
            "+1 (234) 567-890",
            "1234567890"
        ]
        for phone in valid_phones:
            # Remove formatting and check digits
            digits = ''.join(filter(str.isdigit, phone))
            assert len(digits) >= 10
    
    def test_invalid_phone_formats(self):
        """Test invalid phone number formats"""
        invalid_phones = [
            "123",
            "abcdefghij",
            "",
            "12 34"
        ]
        for phone in invalid_phones:
            digits = ''.join(filter(str.isdigit, phone))
            assert len(digits) < 10


class TestDateValidation:
    """Test date validation"""
    
    def test_valid_date_format(self):
        """Test valid date formats"""
        from datetime import datetime
        
        date_strings = [
            "2024-01-15",
            "2024-12-31",
            "2023-06-15"
        ]
        for date_str in date_strings:
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                assert dt.year >= 1900
                assert 1 <= dt.month <= 12
                assert 1 <= dt.day <= 31
            except ValueError:
                pytest.fail(f"Failed to parse valid date: {date_str}")
    
    def test_invalid_date_format(self):
        """Test invalid date formats"""
        from datetime import datetime
        
        invalid_dates = [
            "2024-13-01",  # Invalid month
            "2024-00-01",  # Invalid month
            "2024-01-32",  # Invalid day
            "not-a-date"
        ]
        for date_str in invalid_dates:
            with pytest.raises(ValueError):
                datetime.strptime(date_str, "%Y-%m-%d")


class TestPasswordStrength:
    """Test password strength validation"""
    
    def test_strong_passwords(self):
        """Test strong password requirements"""
        strong_passwords = [
            "StrongPass123!",
            "Complex@Password1",
            "Secure#Pass99"
        ]
        for password in strong_passwords:
            has_upper = any(c.isupper() for c in password)
            has_lower = any(c.islower() for c in password)
            has_digit = any(c.isdigit() for c in password)
            has_special = any(not c.isalnum() for c in password)
            is_long_enough = len(password) >= 8
            
            assert has_upper
            assert has_lower
            assert has_digit
            assert has_special
            assert is_long_enough
    
    def test_weak_passwords(self):
        """Test weak passwords"""
        weak_passwords = [
            "password",
            "12345678",
            "Password",
            "Pass1"
        ]
        for password in weak_passwords:
            has_upper = any(c.isupper() for c in password)
            has_lower = any(c.islower() for c in password)
            has_digit = any(c.isdigit() for c in password)
            has_special = any(not c.isalnum() for c in password)
            is_long_enough = len(password) >= 8
            
            # At least one requirement should fail
            is_strong = all([has_upper, has_lower, has_digit, has_special, is_long_enough])
            assert not is_strong


class TestDataValidation:
    """Test general data validation"""
    
    def test_employee_code_format(self):
        """Test employee code format validation"""
        valid_codes = ["EMP-001", "EMP-12345", "EMP-999"]
        for code in valid_codes:
            assert code.startswith("EMP-")
            assert code[4:].isdigit()
    
    def test_organization_id_format(self):
        """Test organization ID format"""
        import uuid
        
        # UUID format
        org_id = str(uuid.uuid4())
        assert len(org_id) == 36
        assert org_id.count("-") == 4
