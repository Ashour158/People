"""
Performance Monitoring Database Models
"""

from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.database import Base
import uuid
from datetime import datetime

class PerformanceMetric(Base):
    """Model for storing performance metrics"""
    __tablename__ = "performance_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_type = Column(String(50), nullable=False, index=True)  # 'database', 'api', 'cache', 'system'
    metric_name = Column(String(100), nullable=False, index=True)  # 'response_time', 'cpu_usage', etc.
    value = Column(Float, nullable=False)
    unit = Column(String(20), default='count')  # 'seconds', 'bytes', 'percent', 'count'
    tags = Column(JSON)  # Additional metadata
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<PerformanceMetric(metric_type='{self.metric_type}', metric_name='{self.metric_name}', value={self.value})>"

class APIPerformance(Base):
    """Model for storing API performance data"""
    __tablename__ = "api_performance"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    endpoint = Column(String(255), nullable=False, index=True)
    method = Column(String(10), nullable=False)  # GET, POST, PUT, DELETE
    response_time = Column(Float, nullable=False, index=True)  # in seconds
    status_code = Column(Integer, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    request_size = Column(Integer, nullable=True)  # in bytes
    response_size = Column(Integer, nullable=True)  # in bytes
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<APIPerformance(endpoint='{self.endpoint}', response_time={self.response_time}, status_code={self.status_code})>"

class SystemHealthCheck(Base):
    """Model for storing system health check results"""
    __tablename__ = "system_health_checks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    check_type = Column(String(50), nullable=False, index=True)  # 'database', 'cache', 'api', 'storage', 'network'
    status = Column(String(20), nullable=False, index=True)  # 'HEALTHY', 'WARNING', 'CRITICAL', 'DOWN'
    response_time = Column(Float, nullable=False)  # in seconds
    error_count = Column(Integer, default=0)
    details = Column(JSON)  # Additional check details
    last_check = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<SystemHealthCheck(check_type='{self.check_type}', status='{self.status}', response_time={self.response_time})>"

class DatabaseQuery(Base):
    """Model for storing database query performance data"""
    __tablename__ = "database_queries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_hash = Column(String(64), nullable=False, index=True)  # Hash of the query for grouping
    query_text = Column(Text, nullable=False)
    execution_time = Column(Float, nullable=False, index=True)  # in seconds
    rows_returned = Column(Integer, nullable=True)
    rows_examined = Column(Integer, nullable=True)
    database_name = Column(String(100), nullable=True)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<DatabaseQuery(query_hash='{self.query_hash}', execution_time={self.execution_time})>"

class CachePerformance(Base):
    """Model for storing cache performance data"""
    __tablename__ = "cache_performance"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operation = Column(String(20), nullable=False, index=True)  # 'GET', 'SET', 'DELETE', 'EXISTS'
    key_pattern = Column(String(255), nullable=True, index=True)  # Pattern of the key
    response_time = Column(Float, nullable=False, index=True)  # in seconds
    hit = Column(Boolean, nullable=True)  # For GET operations
    key_size = Column(Integer, nullable=True)  # Size of the key in bytes
    value_size = Column(Integer, nullable=True)  # Size of the value in bytes
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<CachePerformance(operation='{self.operation}', response_time={self.response_time}, hit={self.hit})>"

class ErrorLog(Base):
    """Model for storing application errors"""
    __tablename__ = "error_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    error_type = Column(String(100), nullable=False, index=True)  # 'ValidationError', 'DatabaseError', etc.
    error_message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)
    endpoint = Column(String(255), nullable=True, index=True)
    method = Column(String(10), nullable=True)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    request_data = Column(JSON, nullable=True)
    severity = Column(String(20), default='ERROR', index=True)  # 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
    resolved = Column(Boolean, default=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<ErrorLog(error_type='{self.error_type}', severity='{self.severity}', resolved={self.resolved})>"

class PerformanceAlert(Base):
    """Model for storing performance alerts"""
    __tablename__ = "performance_alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_type = Column(String(50), nullable=False, index=True)  # 'SLOW_API', 'HIGH_CPU', 'HIGH_MEMORY', etc.
    severity = Column(String(20), nullable=False, index=True)  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    message = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)
    resolved = Column(Boolean, default=False, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<PerformanceAlert(alert_type='{self.alert_type}', severity='{self.severity}', resolved={self.resolved})>"

class ResourceUsage(Base):
    """Model for storing system resource usage"""
    __tablename__ = "resource_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_type = Column(String(50), nullable=False, index=True)  # 'CPU', 'MEMORY', 'DISK', 'NETWORK'
    usage_percent = Column(Float, nullable=False, index=True)
    total_capacity = Column(Float, nullable=True)  # Total capacity in appropriate units
    used_capacity = Column(Float, nullable=True)  # Used capacity in appropriate units
    available_capacity = Column(Float, nullable=True)  # Available capacity in appropriate units
    unit = Column(String(20), nullable=True)  # 'GB', 'MB', 'percent', etc.
    details = Column(JSON, nullable=True)  # Additional resource-specific details
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<ResourceUsage(resource_type='{self.resource_type}', usage_percent={self.usage_percent})>"

class UserActivity(Base):
    """Model for storing user activity metrics"""
    __tablename__ = "user_activity"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False, index=True)  # 'LOGIN', 'LOGOUT', 'PAGE_VIEW', 'API_CALL'
    endpoint = Column(String(255), nullable=True, index=True)
    session_id = Column(String(100), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    duration = Column(Float, nullable=True)  # Activity duration in seconds
    metadata = Column(JSON, nullable=True)  # Additional activity metadata
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<UserActivity(user_id='{self.user_id}', activity_type='{self.activity_type}')>"

class PerformanceReport(Base):
    """Model for storing generated performance reports"""
    __tablename__ = "performance_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_type = Column(String(50), nullable=False, index=True)  # 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'
    report_name = Column(String(255), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date = Column(DateTime(timezone=True), nullable=False, index=True)
    generated_by = Column(UUID(as_uuid=True), nullable=True, index=True)
    report_data = Column(JSON, nullable=False)  # The actual report data
    file_path = Column(String(500), nullable=True)  # Path to generated report file
    status = Column(String(20), default='GENERATED', index=True)  # 'GENERATING', 'GENERATED', 'FAILED'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<PerformanceReport(report_type='{self.report_type}', report_name='{self.report_name}', status='{self.status}')>"
