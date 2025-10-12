"""
Security Monitoring Middleware
CRITICAL: Monitors and logs security events
"""
from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
import structlog
import json
import time
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
import asyncio

logger = structlog.get_logger()


class SecurityEvent:
    """Security event data structure"""
    
    def __init__(self, event_type: str, severity: str, details: Dict, request: Request):
        self.timestamp = datetime.utcnow()
        self.event_type = event_type
        self.severity = severity  # low, medium, high, critical
        self.details = details
        self.client_ip = request.client.host if request.client else "unknown"
        self.user_agent = request.headers.get("user-agent", "unknown")
        self.url = str(request.url)
        self.method = request.method
        self.user_id = getattr(request.state, 'user_id', None)
        self.session_id = request.cookies.get('session_id')
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for logging"""
        return {
            'timestamp': self.timestamp.isoformat(),
            'event_type': self.event_type,
            'severity': self.severity,
            'details': self.details,
            'client_ip': self.client_ip,
            'user_agent': self.user_agent,
            'url': self.url,
            'method': self.method,
            'user_id': self.user_id,
            'session_id': self.session_id
        }


class SecurityMonitor:
    """Security monitoring service"""
    
    def __init__(self):
        self.events: deque = deque(maxlen=10000)  # Keep last 10k events
        self.rate_limits: Dict[str, List[datetime]] = defaultdict(list)
        self.blocked_ips: Dict[str, datetime] = {}
        self.suspicious_patterns: Dict[str, int] = defaultdict(int)
        self.alert_thresholds = {
            'failed_logins': 5,  # per minute
            'suspicious_requests': 10,  # per minute
            'rate_limit_violations': 20,  # per minute
            'xss_attempts': 3,  # per minute
            'sql_injection_attempts': 3,  # per minute
        }
    
    def log_event(self, event: SecurityEvent):
        """Log security event"""
        self.events.append(event)
        
        # Log to structured logger
        logger.info(
            "security_event",
            **event.to_dict()
        )
        
        # Check for alerts
        self._check_alerts(event)
    
    def _check_alerts(self, event: SecurityEvent):
        """Check if event triggers security alerts"""
        current_time = datetime.utcnow()
        minute_ago = current_time - timedelta(minutes=1)
        
        # Count recent events by type
        recent_events = [
            e for e in self.events 
            if e.timestamp > minute_ago and e.event_type == event.event_type
        ]
        
        # Check thresholds
        if len(recent_events) >= self.alert_thresholds.get(event.event_type, 10):
            self._trigger_alert(event, len(recent_events))
    
    def _trigger_alert(self, event: SecurityEvent, count: int):
        """Trigger security alert"""
        alert_data = {
            'alert_type': f"high_{event.event_type}_rate",
            'count': count,
            'threshold': self.alert_thresholds.get(event.event_type, 10),
            'client_ip': event.client_ip,
            'user_id': event.user_id,
            'timestamp': event.timestamp.isoformat()
        }
        
        logger.warning(
            "security_alert",
            **alert_data
        )
        
        # In production, you might want to:
        # - Send email alerts
        # - Block IP addresses
        # - Notify security team
        # - Update security dashboard
    
    def get_security_stats(self) -> Dict:
        """Get security statistics"""
        current_time = datetime.utcnow()
        hour_ago = current_time - timedelta(hours=1)
        day_ago = current_time - timedelta(days=1)
        
        # Filter events by time
        recent_events = [e for e in self.events if e.timestamp > hour_ago]
        daily_events = [e for e in self.events if e.timestamp > day_ago]
        
        # Count events by type
        event_counts = defaultdict(int)
        severity_counts = defaultdict(int)
        
        for event in recent_events:
            event_counts[event.event_type] += 1
            severity_counts[event.severity] += 1
        
        return {
            'total_events_last_hour': len(recent_events),
            'total_events_last_day': len(daily_events),
            'events_by_type': dict(event_counts),
            'events_by_severity': dict(severity_counts),
            'blocked_ips': len(self.blocked_ips),
            'suspicious_patterns': dict(self.suspicious_patterns)
        }
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is blocked"""
        if ip in self.blocked_ips:
            block_time = self.blocked_ips[ip]
            # Block for 1 hour
            if datetime.utcnow() - block_time < timedelta(hours=1):
                return True
            else:
                # Remove expired block
                del self.blocked_ips[ip]
        return False
    
    def block_ip(self, ip: str, reason: str):
        """Block IP address"""
        self.blocked_ips[ip] = datetime.utcnow()
        logger.warning(f"IP blocked: {ip}, reason: {reason}")
    
    def is_rate_limited(self, ip: str, limit: int = 60) -> bool:
        """Check if IP is rate limited"""
        current_time = datetime.utcnow()
        minute_ago = current_time - timedelta(minutes=1)
        
        # Clean old entries
        self.rate_limits[ip] = [
            timestamp for timestamp in self.rate_limits[ip]
            if timestamp > minute_ago
        ]
        
        # Check if over limit
        if len(self.rate_limits[ip]) >= limit:
            return True
        
        # Add current request
        self.rate_limits[ip].append(current_time)
        return False


class SecurityMonitoringMiddleware(BaseHTTPMiddleware):
    """Security monitoring middleware"""
    
    def __init__(self, app):
        super().__init__(app)
        self.monitor = SecurityMonitor()
    
    async def dispatch(self, request: Request, call_next):
        """Monitor requests for security events"""
        
        # Check if IP is blocked
        client_ip = request.client.host if request.client else "unknown"
        if self.monitor.is_ip_blocked(client_ip):
            return Response(
                content="Access denied",
                status_code=403
            )
        
        # Check rate limiting
        if self.monitor.is_rate_limited(client_ip):
            event = SecurityEvent(
                "rate_limit_exceeded",
                "medium",
                {"ip": client_ip, "limit": 60},
                request
            )
            self.monitor.log_event(event)
            
            return Response(
                content="Rate limit exceeded",
                status_code=429
            )
        
        # Monitor for suspicious patterns
        await self._monitor_request(request)
        
        # Process request
        response = await call_next(request)
        
        # Monitor response
        await self._monitor_response(request, response)
        
        return response
    
    async def _monitor_request(self, request: Request):
        """Monitor request for security issues"""
        
        # Check for suspicious headers
        suspicious_headers = [
            'x-forwarded-for', 'x-real-ip', 'x-originating-ip',
            'x-remote-ip', 'x-remote-addr', 'x-client-ip'
        ]
        
        for header in suspicious_headers:
            if header in request.headers:
                event = SecurityEvent(
                    "suspicious_header",
                    "low",
                    {"header": header, "value": request.headers[header]},
                    request
                )
                self.monitor.log_event(event)
        
        # Check for SQL injection patterns in URL
        sql_patterns = [
            'union select', 'drop table', 'delete from',
            'insert into', 'update set', 'exec('
        ]
        
        url_str = str(request.url).lower()
        for pattern in sql_patterns:
            if pattern in url_str:
                event = SecurityEvent(
                    "sql_injection_attempt",
                    "high",
                    {"pattern": pattern, "url": str(request.url)},
                    request
                )
                self.monitor.log_event(event)
                break
        
        # Check for XSS patterns in URL
        xss_patterns = [
            '<script', 'javascript:', 'onload=', 'onerror=',
            '<iframe', '<object', '<embed'
        ]
        
        for pattern in xss_patterns:
            if pattern in url_str:
                event = SecurityEvent(
                    "xss_attempt",
                    "high",
                    {"pattern": pattern, "url": str(request.url)},
                    request
                )
                self.monitor.log_event(event)
                break
    
    async def _monitor_response(self, request: Request, response: Response):
        """Monitor response for security issues"""
        
        # Log high status codes
        if response.status_code >= 400:
            severity = "high" if response.status_code >= 500 else "medium"
            event = SecurityEvent(
                "http_error",
                severity,
                {
                    "status_code": response.status_code,
                    "url": str(request.url),
                    "method": request.method
                },
                request
            )
            self.monitor.log_event(event)
        
        # Log authentication failures
        if response.status_code == 401:
            event = SecurityEvent(
                "authentication_failure",
                "medium",
                {"url": str(request.url), "method": request.method},
                request
            )
            self.monitor.log_event(event)
        
        # Log authorization failures
        if response.status_code == 403:
            event = SecurityEvent(
                "authorization_failure",
                "medium",
                {"url": str(request.url), "method": request.method},
                request
            )
            self.monitor.log_event(event)


# Global security monitor
_security_monitor: Optional[SecurityMonitor] = None


def get_security_monitor() -> SecurityMonitor:
    """Get or create global security monitor"""
    global _security_monitor
    
    if _security_monitor is None:
        _security_monitor = SecurityMonitor()
    
    return _security_monitor


def log_security_event(
    event_type: str,
    severity: str,
    details: Dict,
    request: Request
):
    """Log security event"""
    monitor = get_security_monitor()
    event = SecurityEvent(event_type, severity, details, request)
    monitor.log_event(event)
