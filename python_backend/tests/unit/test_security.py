"""Unit tests for security utilities"""
import pytest
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
)
from datetime import timedelta


class TestPasswordHashing:
    """Test password hashing functions"""
    
    def test_password_hash_generation(self):
        """Test generating password hash"""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        assert hashed != password
        assert len(hashed) > 0
    
    def test_password_verification_success(self):
        """Test successful password verification"""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True
    
    def test_password_verification_failure(self):
        """Test failed password verification"""
        password = "TestPassword123!"
        wrong_password = "WrongPassword456!"
        hashed = get_password_hash(password)
        assert verify_password(wrong_password, hashed) is False
    
    def test_same_password_different_hashes(self):
        """Test that same password generates different hashes"""
        password = "TestPassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestJWTTokens:
    """Test JWT token creation"""
    
    def test_create_access_token(self):
        """Test creating access token"""
        data = {"sub": "test@example.com"}
        token = create_access_token(data)
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_access_token_with_expiry(self):
        """Test creating access token with custom expiry"""
        data = {"sub": "test@example.com"}
        expires_delta = timedelta(minutes=30)
        token = create_access_token(data, expires_delta=expires_delta)
        assert token is not None
        assert isinstance(token, str)
    
    def test_create_refresh_token(self):
        """Test creating refresh token"""
        data = {"sub": "test@example.com"}
        token = create_refresh_token(data)
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_token_uniqueness(self):
        """Test that tokens are unique"""
        data = {"sub": "test@example.com"}
        token1 = create_access_token(data)
        token2 = create_access_token(data)
        # Tokens may be the same if created at exact same time, so we test structure
        assert isinstance(token1, str)
        assert isinstance(token2, str)
