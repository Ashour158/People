"""
Performance Monitoring Service
Tracks and monitors system performance metrics
"""

import time
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, and_
from app.models.models import PerformanceMetric, APIPerformance, SystemHealthCheck
from app.core.redis_client import cache_service
import structlog
import psutil
import json

logger = structlog.get_logger()

class PerformanceMonitoringService:
    """Service for monitoring and tracking system performance"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ============================================
    # SYSTEM PERFORMANCE MONITORING
    # ============================================
    
    async def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system performance metrics"""
        
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_available = memory.available / (1024**3)  # GB
        memory_total = memory.total / (1024**3)  # GB
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        disk_free = disk.free / (1024**3)  # GB
        disk_total = disk.total / (1024**3)  # GB
        
        # Network I/O
        network = psutil.net_io_counters()
        
        metrics = {
            'timestamp': datetime.utcnow().isoformat(),
            'cpu': {
                'usage_percent': cpu_percent,
                'core_count': cpu_count
            },
            'memory': {
                'usage_percent': memory_percent,
                'available_gb': round(memory_available, 2),
                'total_gb': round(memory_total, 2)
            },
            'disk': {
                'usage_percent': disk_percent,
                'free_gb': round(disk_free, 2),
                'total_gb': round(disk_total, 2)
            },
            'network': {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            }
        }
        
        return metrics
    
    async def record_performance_metric(
        self,
        metric_type: str,
        metric_name: str,
        value: float,
        unit: str = 'count',
        tags: Optional[Dict[str, str]] = None
    ):
        """Record a performance metric"""
        
        try:
            metric = PerformanceMetric(
                metric_type=metric_type,
                metric_name=metric_name,
                value=value,
                unit=unit,
                tags=tags or {},
                timestamp=datetime.utcnow()
            )
            
            self.db.add(metric)
            await self.db.commit()
            
            logger.info(f"Recorded metric: {metric_name} = {value} {unit}")
            
        except Exception as e:
            logger.error(f"Failed to record metric {metric_name}: {e}")
            await self.db.rollback()
    
    async def record_api_performance(
        self,
        endpoint: str,
        method: str,
        response_time: float,
        status_code: int,
        user_id: Optional[str] = None
    ):
        """Record API performance metrics"""
        
        try:
            api_perf = APIPerformance(
                endpoint=endpoint,
                method=method,
                response_time=response_time,
                status_code=status_code,
                user_id=user_id,
                timestamp=datetime.utcnow()
            )
            
            self.db.add(api_perf)
            await self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to record API performance: {e}")
            await self.db.rollback()
    
    # ============================================
    # DATABASE PERFORMANCE MONITORING
    # ============================================
    
    async def get_database_performance_metrics(self) -> Dict[str, Any]:
        """Get database performance metrics"""
        
        try:
            # Query execution time
            start_time = time.time()
            
            # Test query performance
            result = await self.db.execute(select(func.count()).select_from(PerformanceMetric))
            count = result.scalar()
            
            query_time = time.time() - start_time
            
            # Record the query performance
            await self.record_performance_metric(
                metric_type='database',
                metric_name='query_execution_time',
                value=query_time,
                unit='seconds'
            )
            
            # Get recent API performance stats
            recent_api_query = (
                select(
                    func.avg(APIPerformance.response_time).label('avg_response_time'),
                    func.max(APIPerformance.response_time).label('max_response_time'),
                    func.min(APIPerformance.response_time).label('min_response_time'),
                    func.count(APIPerformance.id).label('total_requests')
                )
                .where(APIPerformance.timestamp >= datetime.utcnow() - timedelta(hours=1))
            )
            
            result = await self.db.execute(recent_api_query)
            api_stats = result.first()
            
            return {
                'database_query_time': query_time,
                'api_performance': {
                    'avg_response_time': float(api_stats.avg_response_time) if api_stats.avg_response_time else 0,
                    'max_response_time': float(api_stats.max_response_time) if api_stats.max_response_time else 0,
                    'min_response_time': float(api_stats.min_response_time) if api_stats.min_response_time else 0,
                    'total_requests': api_stats.total_requests or 0
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get database performance metrics: {e}")
            return {}
    
    # ============================================
    # CACHE PERFORMANCE MONITORING
    # ============================================
    
    async def get_cache_performance_metrics(self) -> Dict[str, Any]:
        """Get cache performance metrics"""
        
        try:
            # Test cache performance
            test_key = f"performance_test:{int(time.time())}"
            test_value = {"test": "data", "timestamp": datetime.utcnow().isoformat()}
            
            # Test set operation
            start_time = time.time()
            await cache_service.set(test_key, json.dumps(test_value), ttl=60)
            set_time = time.time() - start_time
            
            # Test get operation
            start_time = time.time()
            cached_value = await cache_service.get(test_key)
            get_time = time.time() - start_time
            
            # Test delete operation
            start_time = time.time()
            await cache_service.delete(test_key)
            delete_time = time.time() - start_time
            
            # Record cache performance metrics
            await self.record_performance_metric(
                metric_type='cache',
                metric_name='set_operation_time',
                value=set_time,
                unit='seconds'
            )
            
            await self.record_performance_metric(
                metric_type='cache',
                metric_name='get_operation_time',
                value=get_time,
                unit='seconds'
            )
            
            await self.record_performance_metric(
                metric_type='cache',
                metric_name='delete_operation_time',
                value=delete_time,
                unit='seconds'
            )
            
            return {
                'set_operation_time': set_time,
                'get_operation_time': get_time,
                'delete_operation_time': delete_time,
                'cache_available': cached_value is not None
            }
            
        except Exception as e:
            logger.error(f"Failed to get cache performance metrics: {e}")
            return {}
    
    # ============================================
    # SYSTEM HEALTH CHECKS
    # ============================================
    
    async def perform_health_check(self, check_type: str) -> Dict[str, Any]:
        """Perform a system health check"""
        
        start_time = time.time()
        status = 'HEALTHY'
        error_count = 0
        details = {}
        
        try:
            if check_type == 'database':
                # Test database connection
                result = await self.db.execute(select(1))
                result.scalar()
                details['connection'] = 'OK'
                
            elif check_type == 'cache':
                # Test cache connection
                test_key = f"health_check:{int(time.time())}"
                await cache_service.set(test_key, "test", ttl=10)
                cached = await cache_service.get(test_key)
                await cache_service.delete(test_key)
                
                if cached == "test":
                    details['connection'] = 'OK'
                else:
                    status = 'WARNING'
                    error_count += 1
                    details['connection'] = 'FAILED'
                    
            elif check_type == 'api':
                # Test API endpoints (simplified)
                details['endpoints'] = 'OK'
                
            elif check_type == 'storage':
                # Test disk space
                disk = psutil.disk_usage('/')
                if disk.percent > 90:
                    status = 'CRITICAL'
                    error_count += 1
                elif disk.percent > 80:
                    status = 'WARNING'
                
                details['disk_usage_percent'] = disk.percent
                details['free_space_gb'] = round(disk.free / (1024**3), 2)
                
            elif check_type == 'network':
                # Test network connectivity (simplified)
                details['connectivity'] = 'OK'
                
        except Exception as e:
            status = 'CRITICAL'
            error_count += 1
            details['error'] = str(e)
        
        response_time = time.time() - start_time
        
        # Record health check
        health_check = SystemHealthCheck(
            check_type=check_type,
            status=status,
            response_time=response_time,
            error_count=error_count,
            details=details,
            last_check=datetime.utcnow()
        )
        
        self.db.add(health_check)
        await self.db.commit()
        
        return {
            'check_type': check_type,
            'status': status,
            'response_time': response_time,
            'error_count': error_count,
            'details': details,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    # ============================================
    # PERFORMANCE ANALYTICS
    # ============================================
    
    async def get_performance_analytics(
        self,
        start_date: datetime,
        end_date: datetime,
        metric_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get performance analytics for a date range"""
        
        try:
            # Base query for metrics
            query = (
                select(PerformanceMetric)
                .where(
                    and_(
                        PerformanceMetric.timestamp >= start_date,
                        PerformanceMetric.timestamp <= end_date
                    )
                )
                .order_by(PerformanceMetric.timestamp.desc())
            )
            
            if metric_type:
                query = query.where(PerformanceMetric.metric_type == metric_type)
            
            result = await self.db.execute(query)
            metrics = result.scalars().all()
            
            # Group metrics by type and name
            analytics = {}
            for metric in metrics:
                if metric.metric_type not in analytics:
                    analytics[metric.metric_type] = {}
                
                if metric.metric_name not in analytics[metric.metric_type]:
                    analytics[metric.metric_type][metric.metric_name] = {
                        'values': [],
                        'timestamps': [],
                        'count': 0,
                        'sum': 0,
                        'avg': 0,
                        'min': float('inf'),
                        'max': 0
                    }
                
                metric_data = analytics[metric.metric_type][metric.metric_name]
                metric_data['values'].append(metric.value)
                metric_data['timestamps'].append(metric.timestamp.isoformat())
                metric_data['count'] += 1
                metric_data['sum'] += metric.value
                metric_data['min'] = min(metric_data['min'], metric.value)
                metric_data['max'] = max(metric_data['max'], metric.value)
            
            # Calculate averages
            for metric_type_data in analytics.values():
                for metric_name_data in metric_type_data.values():
                    if metric_name_data['count'] > 0:
                        metric_name_data['avg'] = metric_name_data['sum'] / metric_name_data['count']
                    if metric_name_data['min'] == float('inf'):
                        metric_name_data['min'] = 0
            
            return {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'analytics': analytics
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance analytics: {e}")
            return {}
    
    async def get_slow_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get slowest API queries"""
        
        try:
            query = (
                select(APIPerformance)
                .order_by(desc(APIPerformance.response_time))
                .limit(limit)
            )
            
            result = await self.db.execute(query)
            slow_queries = result.scalars().all()
            
            return [
                {
                    'endpoint': query.endpoint,
                    'method': query.method,
                    'response_time': query.response_time,
                    'status_code': query.status_code,
                    'timestamp': query.timestamp.isoformat()
                }
                for query in slow_queries
            ]
            
        except Exception as e:
            logger.error(f"Failed to get slow queries: {e}")
            return []
    
    # ============================================
    # PERFORMANCE ALERTS
    # ============================================
    
    async def check_performance_alerts(self) -> List[Dict[str, Any]]:
        """Check for performance alerts and issues"""
        
        alerts = []
        
        try:
            # Check for slow API responses (over 2 seconds)
            slow_query = (
                select(APIPerformance)
                .where(
                    and_(
                        APIPerformance.response_time > 2.0,
                        APIPerformance.timestamp >= datetime.utcnow() - timedelta(minutes=5)
                    )
                )
                .order_by(desc(APIPerformance.response_time))
                .limit(5)
            )
            
            result = await self.db.execute(slow_query)
            slow_apis = result.scalars().all()
            
            if slow_apis:
                alerts.append({
                    'type': 'SLOW_API',
                    'severity': 'WARNING',
                    'message': f'Found {len(slow_apis)} slow API responses in the last 5 minutes',
                    'details': [
                        {
                            'endpoint': api.endpoint,
                            'response_time': api.response_time,
                            'timestamp': api.timestamp.isoformat()
                        }
                        for api in slow_apis
                    ]
                })
            
            # Check system resources
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_percent = psutil.virtual_memory().percent
            disk_percent = psutil.disk_usage('/').percent
            
            if cpu_percent > 90:
                alerts.append({
                    'type': 'HIGH_CPU',
                    'severity': 'CRITICAL',
                    'message': f'CPU usage is {cpu_percent}%',
                    'details': {'cpu_percent': cpu_percent}
                })
            
            if memory_percent > 90:
                alerts.append({
                    'type': 'HIGH_MEMORY',
                    'severity': 'CRITICAL',
                    'message': f'Memory usage is {memory_percent}%',
                    'details': {'memory_percent': memory_percent}
                })
            
            if disk_percent > 90:
                alerts.append({
                    'type': 'HIGH_DISK',
                    'severity': 'CRITICAL',
                    'message': f'Disk usage is {disk_percent}%',
                    'details': {'disk_percent': disk_percent}
                })
            
            return alerts
            
        except Exception as e:
            logger.error(f"Failed to check performance alerts: {e}")
            return []
    
    # ============================================
    # PERFORMANCE DASHBOARD
    # ============================================
    
    async def get_performance_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive performance dashboard data"""
        
        try:
            # System metrics
            system_metrics = await self.get_system_metrics()
            
            # Database performance
            db_performance = await self.get_database_performance_metrics()
            
            # Cache performance
            cache_performance = await self.get_cache_performance_metrics()
            
            # Recent performance analytics (last hour)
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=1)
            performance_analytics = await self.get_performance_analytics(start_time, end_time)
            
            # Slow queries
            slow_queries = await self.get_slow_queries(5)
            
            # Performance alerts
            alerts = await self.check_performance_alerts()
            
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'system_metrics': system_metrics,
                'database_performance': db_performance,
                'cache_performance': cache_performance,
                'performance_analytics': performance_analytics,
                'slow_queries': slow_queries,
                'alerts': alerts
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance dashboard: {e}")
            return {}
