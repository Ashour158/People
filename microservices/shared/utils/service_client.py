"""
Service Communication Client
HTTP client for synchronous inter-service communication
"""
import httpx
from typing import Dict, Any, Optional, List
from uuid import UUID
import asyncio
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ServiceClient:
    """
    Base HTTP client for inter-service communication
    Handles authentication, retries, circuit breaking, and timeouts
    """
    
    def __init__(
        self,
        service_name: str,
        base_url: str,
        timeout: float = 30.0,
        max_retries: int = 3,
        api_key: Optional[str] = None
    ):
        self.service_name = service_name
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        self.api_key = api_key
        
        # Circuit breaker state
        self.failures = 0
        self.max_failures = 5
        self.circuit_open = False
        self.circuit_open_until = None
        
        # Default headers
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": f"ServiceClient/{service_name}",
        }
        
        if api_key:
            self.headers["X-API-Key"] = api_key
    
    async def get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Make GET request to another service"""
        return await self._request("GET", path, params=params, headers=headers)
    
    async def post(
        self,
        path: str,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Make POST request to another service"""
        return await self._request("POST", path, json=data, headers=headers)
    
    async def put(
        self,
        path: str,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Make PUT request to another service"""
        return await self._request("PUT", path, json=data, headers=headers)
    
    async def delete(
        self,
        path: str,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Make DELETE request to another service"""
        return await self._request("DELETE", path, headers=headers)
    
    async def _request(
        self,
        method: str,
        path: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Make HTTP request with retry logic and circuit breaker
        
        Args:
            method: HTTP method
            path: API path
            **kwargs: Additional arguments for httpx request
            
        Returns:
            Response data
            
        Raises:
            ServiceUnavailableError: If circuit breaker is open
            ServiceError: If request fails after retries
        """
        # Check circuit breaker
        if self.circuit_open:
            if datetime.utcnow() < self.circuit_open_until:
                raise ServiceUnavailableError(
                    f"{self.service_name} is unavailable (circuit breaker open)"
                )
            else:
                # Try to close circuit
                self.circuit_open = False
                self.failures = 0
        
        url = f"{self.base_url}{path}"
        
        # Merge headers
        request_headers = self.headers.copy()
        if kwargs.get('headers'):
            request_headers.update(kwargs.pop('headers'))
        
        # Retry logic
        last_exception = None
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.request(
                        method,
                        url,
                        headers=request_headers,
                        **kwargs
                    )
                    
                    # Check status
                    if response.status_code >= 500:
                        raise ServiceError(
                            f"{self.service_name} returned {response.status_code}"
                        )
                    
                    response.raise_for_status()
                    
                    # Reset failure counter on success
                    self.failures = 0
                    
                    # Return response data
                    if response.status_code == 204:  # No Content
                        return {"success": True}
                    
                    return response.json()
                    
            except httpx.TimeoutException as e:
                last_exception = ServiceTimeoutError(
                    f"{self.service_name} request timed out after {self.timeout}s"
                )
                logger.warning(f"Request timeout (attempt {attempt + 1}/{self.max_retries}): {url}")
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code >= 500:
                    last_exception = ServiceError(
                        f"{self.service_name} error: {e.response.status_code}"
                    )
                    logger.error(f"Server error (attempt {attempt + 1}/{self.max_retries}): {url}")
                else:
                    # Client errors (4xx) should not be retried
                    raise ServiceError(
                        f"{self.service_name} client error: {e.response.status_code}"
                    )
                    
            except Exception as e:
                last_exception = ServiceError(
                    f"{self.service_name} request failed: {str(e)}"
                )
                logger.error(f"Request error (attempt {attempt + 1}/{self.max_retries}): {str(e)}")
            
            # Exponential backoff
            if attempt < self.max_retries - 1:
                wait_time = 2 ** attempt  # 1s, 2s, 4s
                await asyncio.sleep(wait_time)
        
        # All retries failed
        self.failures += 1
        
        # Open circuit breaker if too many failures
        if self.failures >= self.max_failures:
            self.circuit_open = True
            self.circuit_open_until = datetime.utcnow().replace(
                second=datetime.utcnow().second + 60  # Open for 60 seconds
            )
            logger.error(f"Circuit breaker opened for {self.service_name}")
        
        raise last_exception


# ==========================================
# SERVICE-SPECIFIC CLIENTS
# ==========================================

class EmployeeServiceClient(ServiceClient):
    """Client for Employee Service"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        super().__init__("employee-service", base_url, api_key=api_key)
    
    async def get_employee(self, employee_id: UUID) -> Dict[str, Any]:
        """Get employee by ID"""
        return await self.get(f"/api/v1/employees/{employee_id}")
    
    async def get_employees(
        self,
        organization_id: UUID,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get employees for organization"""
        return await self.get(
            "/api/v1/employees",
            params={
                "organization_id": str(organization_id),
                "page": page,
                "limit": limit
            }
        )
    
    async def create_employee(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new employee"""
        return await self.post("/api/v1/employees", data=employee_data)
    
    async def update_employee(
        self,
        employee_id: UUID,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update employee"""
        return await self.put(f"/api/v1/employees/{employee_id}", data=update_data)


class AttendanceServiceClient(ServiceClient):
    """Client for Attendance Service"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        super().__init__("attendance-service", base_url, api_key=api_key)
    
    async def get_attendance(
        self,
        employee_id: UUID,
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """Get attendance records for employee"""
        return await self.get(
            "/api/v1/attendance",
            params={
                "employee_id": str(employee_id),
                "start_date": start_date,
                "end_date": end_date
            }
        )
    
    async def check_in(self, employee_id: UUID, location: Optional[Dict] = None) -> Dict[str, Any]:
        """Check in employee"""
        return await self.post(
            "/api/v1/attendance/check-in",
            data={"employee_id": str(employee_id), "location": location}
        )


class LeaveServiceClient(ServiceClient):
    """Client for Leave Service"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        super().__init__("leave-service", base_url, api_key=api_key)
    
    async def get_leave_balance(self, employee_id: UUID) -> Dict[str, Any]:
        """Get leave balance for employee"""
        return await self.get(f"/api/v1/leave/balance/{employee_id}")
    
    async def request_leave(self, leave_data: Dict[str, Any]) -> Dict[str, Any]:
        """Request leave"""
        return await self.post("/api/v1/leave", data=leave_data)
    
    async def approve_leave(self, leave_id: UUID, approver_id: UUID) -> Dict[str, Any]:
        """Approve leave request"""
        return await self.post(
            f"/api/v1/leave/{leave_id}/approve",
            data={"approver_id": str(approver_id)}
        )


class NotificationServiceClient(ServiceClient):
    """Client for Notification Service"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        super().__init__("notification-service", base_url, api_key=api_key)
    
    async def send_notification(
        self,
        recipient_id: UUID,
        title: str,
        message: str,
        notification_type: str = "info",
        channels: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Send notification to user"""
        return await self.post(
            "/api/v1/notifications",
            data={
                "recipient_id": str(recipient_id),
                "title": title,
                "message": message,
                "notification_type": notification_type,
                "channels": channels or ["in_app"]
            }
        )
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        template: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send email"""
        return await self.post(
            "/api/v1/notifications/email",
            data={
                "to_email": to_email,
                "subject": subject,
                "template": template,
                "context": context
            }
        )


class PayrollServiceClient(ServiceClient):
    """Client for Payroll Service"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        super().__init__("payroll-service", base_url, api_key=api_key)
    
    async def generate_payroll(
        self,
        organization_id: UUID,
        pay_period_start: str,
        pay_period_end: str
    ) -> Dict[str, Any]:
        """Generate payroll for organization"""
        return await self.post(
            "/api/v1/payroll/generate",
            data={
                "organization_id": str(organization_id),
                "pay_period_start": pay_period_start,
                "pay_period_end": pay_period_end
            }
        )
    
    async def get_payslip(self, payslip_id: UUID) -> Dict[str, Any]:
        """Get payslip by ID"""
        return await self.get(f"/api/v1/payroll/payslips/{payslip_id}")


# ==========================================
# EXCEPTIONS
# ==========================================

class ServiceError(Exception):
    """Base exception for service communication errors"""
    pass


class ServiceUnavailableError(ServiceError):
    """Service is unavailable (circuit breaker open)"""
    pass


class ServiceTimeoutError(ServiceError):
    """Service request timed out"""
    pass


# ==========================================
# SERVICE REGISTRY
# ==========================================

class ServiceRegistry:
    """
    Registry for managing service URLs and clients
    Can be configured from environment variables or configuration files
    """
    
    def __init__(self):
        self.services = {}
        self.clients = {}
    
    def register_service(
        self,
        service_name: str,
        base_url: str,
        api_key: Optional[str] = None
    ):
        """Register a service"""
        self.services[service_name] = {
            "base_url": base_url,
            "api_key": api_key
        }
    
    def get_client(self, service_name: str) -> ServiceClient:
        """Get or create service client"""
        if service_name not in self.clients:
            if service_name not in self.services:
                raise ValueError(f"Service not registered: {service_name}")
            
            service_info = self.services[service_name]
            
            # Create appropriate client
            client_classes = {
                "employee-service": EmployeeServiceClient,
                "attendance-service": AttendanceServiceClient,
                "leave-service": LeaveServiceClient,
                "notification-service": NotificationServiceClient,
                "payroll-service": PayrollServiceClient,
            }
            
            client_class = client_classes.get(service_name, ServiceClient)
            self.clients[service_name] = client_class(
                base_url=service_info["base_url"],
                api_key=service_info.get("api_key")
            )
        
        return self.clients[service_name]


# Global service registry instance
service_registry = ServiceRegistry()


# ==========================================
# USAGE EXAMPLE
# ==========================================

"""
Example Usage:

# Configure service registry
from microservices.shared.utils.service_client import service_registry

service_registry.register_service(
    "employee-service",
    base_url="http://employee-service:8001",
    api_key="secret-key-123"
)

service_registry.register_service(
    "notification-service",
    base_url="http://notification-service:8002"
)

# Use service clients
employee_client = service_registry.get_client("employee-service")
employee = await employee_client.get_employee(employee_id)

notification_client = service_registry.get_client("notification-service")
await notification_client.send_notification(
    recipient_id=employee_id,
    title="Welcome!",
    message="Welcome to the company"
)
"""
