"""
Configuration settings for the HR Management System.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    app_name: str = "HR Management System"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "hr_system"
    db_user: str = "postgres"
    db_password: str = ""
    db_pool_min: int = 2
    db_pool_max: int = 10
    
    # JWT
    jwt_secret: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: Optional[str] = None
    
    # Email
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: str = "noreply@example.com"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]
    
    # Security
    bcrypt_rounds: int = 12
    max_login_attempts: int = 5
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
