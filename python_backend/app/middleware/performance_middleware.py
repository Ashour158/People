"""
Performance Monitoring Middleware
Tracks API performance and system metrics
"""

import time
import asyncio
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import structlog
from app.services.performance_monitoring import PerformanceMonitoringService
from app.db.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()

class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for monitoring API performance and system metrics"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.performance_service = None
    
    async def dispatch(self, request: Request, call_next):
        # Start timing
        start_time = time.time()
        
        # Get request details
        endpoint = str(request.url.path)
        method = request.method
        user_id = getattr(request.state, 'user_id', None)
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Record API performance
            await self._record_api_performance(
                endpoint=endpoint,
                method=method,
                response_time=response_time,
                status_code=response.status_code,
                user_id=user_id,
                request=request,
                response=response
            )
            
            # Add performance headers
            response.headers["X-Response-Time"] = f"{response_time:.4f}s"
            response.headers["X-Request-ID"] = getattr(request.state, 'request_id', 'unknown')
            
            return response
            
        except Exception as e:
            # Calculate response time even for errors
            response_time = time.time() - start_time
            
            # Record error performance
            await self._record_api_performance(
                endpoint=endpoint,
                method=method,
                response_time=response_time,
                status_code=500,
                user_id=user_id,
                request=request,
                response=None,
                error=str(e)
            )
            
            # Re-raise the exception
            raise
    
    async def _record_api_performance(
        self,
        endpoint: str,
        method: str,
        response_time: float,
        status_code: int,
        user_id: str = None,
        request: Request = None,
        response: Response = None,
        error: str = None
    ):
        """Record API performance metrics"""
        try:
            # Get database session
            async for db in get_db():
                performance_service = PerformanceMonitoringService(db)
                
                # Record API performance
                await performance_service.record_api_performance(
                    endpoint=endpoint,
                    method=method,
                    response_time=response_time,
                    status_code=status_code,
                    user_id=user_id
                )
                
                # Record performance metrics
                await performance_service.record_performance_metric(
                    metric_type='api',
                    metric_name='response_time',
                    value=response_time,
                    unit='seconds',
                    tags={
                        'endpoint': endpoint,
                        'method': method,
                        'status_code': str(status_code)
                    }
                )
                
                # Record throughput metrics
                await performance_service.record_performance_metric(
                    metric_type='api',
                    metric_name='requests_per_second',
                    value=1.0 / response_time if response_time > 0 else 0,
                    unit='requests/second',
                    tags={
                        'endpoint': endpoint,
                        'method': method
                    }
                )
                
                # Record error metrics if applicable
                if status_code >= 400:
                    await performance_service.record_performance_metric(
                        metric_type='api',
                        metric_name='error_rate',
                        value=1.0,
                        unit='count',
                        tags={
                            'endpoint': endpoint,
                            'method': method,
                            'status_code': str(status_code)
                        }
                    )
                
                break
                
        except Exception as e:
            logger.error(f"Failed to record API performance: {e}")

class DatabaseQueryMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for monitoring database query performance"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.query_times = {}
    
    async def dispatch(self, request: Request, call_next):
        # Track database query performance
        request.state.db_query_count = 0
        request.state.db_query_time = 0.0
        
        response = await call_next(request)
        
        # Add database performance headers
        if hasattr(request.state, 'db_query_count'):
            response.headers["X-DB-Query-Count"] = str(request.state.db_query_count)
            response.headers["X-DB-Query-Time"] = f"{request.state.db_query_time:.4f}s"
        
        return response

class CachePerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware for monitoring cache performance"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0
        }
    
    async def dispatch(self, request: Request, call_next):
        # Reset cache stats for this request
        request.state.cache_hits = 0
        request.state.cache_misses = 0
        request.state.cache_sets = 0
        request.state.cache_deletes = 0
        
        response = await call_next(request)
        
        # Add cache performance headers
        response.headers["X-Cache-Hits"] = str(getattr(request.state, 'cache_hits', 0))
        response.headers["X-Cache-Misses"] = str(getattr(request.state, 'cache_misses', 0))
        response.headers["X-Cache-Sets"] = str(getattr(request.state, 'cache_sets', 0))
        response.headers["X-Cache-Deletes"] = str(getattr(request.state, 'cache_deletes', 0))
        
        return response

class SystemMetricsMiddleware(BaseHTTPMiddleware):
    """Middleware for collecting system metrics"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.last_metrics_time = 0
        self.metrics_interval = 60  # Collect metrics every 60 seconds
    
    async def dispatch(self, request: Request, call_next):
        current_time = time.time()
        
        # Collect system metrics periodically
        if current_time - self.last_metrics_time > self.metrics_interval:
            await self._collect_system_metrics()
            self.last_metrics_time = current_time
        
        response = await call_next(request)
        return response
    
    async def _collect_system_metrics(self):
        """Collect and record system metrics"""
        try:
            # Get database session
            async for db in get_db():
                performance_service = PerformanceMonitoringService(db)
                
                # Get system metrics
                system_metrics = await performance_service.get_system_metrics()
                
                # Record CPU usage
                await performance_service.record_performance_metric(
                    metric_type='system',
                    metric_name='cpu_usage',
                    value=system_metrics['cpu']['usage_percent'],
                    unit='percent'
                )
                
                # Record memory usage
                await performance_service.record_performance_metric(
                    metric_type='system',
                    metric_name='memory_usage',
                    value=system_metrics['memory']['usage_percent'],
                    unit='percent'
                )
                
                # Record disk usage
                await performance_service.record_performance_metric(
                    metric_type='system',
                    metric_name='disk_usage',
                    value=system_metrics['disk']['usage_percent'],
                    unit='percent'
                )
                
                break
                
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")

class PerformanceAlertMiddleware(BaseHTTPMiddleware):
    """Middleware for checking performance alerts"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.last_alert_check = 0
        self.alert_check_interval = 300  # Check alerts every 5 minutes
    
    async def dispatch(self, request: Request, call_next):
        current_time = time.time()
        
        # Check for performance alerts periodically
        if current_time - self.last_alert_check > self.alert_check_interval:
            await self._check_performance_alerts()
            self.last_alert_check = current_time
        
        response = await call_next(request)
        return response
    
    async def _check_performance_alerts(self):
        """Check for performance alerts"""
        try:
            # Get database session
            async for db in get_db():
                performance_service = PerformanceMonitoringService(db)
                
                # Check for alerts
                alerts = await performance_service.check_performance_alerts()
                
                if alerts:
                    logger.warning(f"Performance alerts detected: {len(alerts)} alerts")
                    for alert in alerts:
                        logger.warning(f"Alert: {alert['type']} - {alert['message']}")
                
                break
                
        except Exception as e:
            logger.error(f"Failed to check performance alerts: {e}")

# Performance monitoring decorator for functions
def monitor_performance(metric_name: str, metric_type: str = 'function'):
    """Decorator to monitor function performance"""
    def decorator(func: Callable):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Record performance metric
                try:
                    async for db in get_db():
                        performance_service = PerformanceMonitoringService(db)
                        await performance_service.record_performance_metric(
                            metric_type=metric_type,
                            metric_name=metric_name,
                            value=execution_time,
                            unit='seconds'
                        )
                        break
                except Exception as e:
                    logger.error(f"Failed to record function performance: {e}")
                
                return result
                
            except Exception as e:
                execution_time = time.time() - start_time
                
                # Record error performance
                try:
                    async for db in get_db():
                        performance_service = PerformanceMonitoringService(db)
                        await performance_service.record_performance_metric(
                            metric_type=metric_type,
                            metric_name=f"{metric_name}_error",
                            value=execution_time,
                            unit='seconds'
                        )
                        break
                except Exception as e:
                    logger.error(f"Failed to record function error performance: {e}")
                
                raise
        
        return wrapper
    return decorator
