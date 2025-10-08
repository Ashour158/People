"""API v1 router"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, employees, attendance, leave

api_router = APIRouter()

# Include routers
api_router.include_router(auth.router)
api_router.include_router(employees.router)
api_router.include_router(attendance.router)
api_router.include_router(leave.router)

# Add more routers as needed
# api_router.include_router(payroll.router)
# api_router.include_router(performance.router)
# api_router.include_router(recruitment.router)
