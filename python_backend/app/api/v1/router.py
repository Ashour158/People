"""API v1 router"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, employees, attendance, leave, 
    payroll, performance, workflows,
    oauth, graphql_api, ai_analytics, recruitment,
    expenses, helpdesk, esignature
)

api_router = APIRouter()

# Include routers
api_router.include_router(auth.router)
api_router.include_router(employees.router)
api_router.include_router(attendance.router)
api_router.include_router(leave.router)
api_router.include_router(payroll.router)
api_router.include_router(performance.router)
api_router.include_router(workflows.router)
api_router.include_router(oauth.router)
api_router.include_router(graphql_api.router)
api_router.include_router(ai_analytics.router)
api_router.include_router(recruitment.router)

# New feature routers
api_router.include_router(expenses.router)
api_router.include_router(helpdesk.router)
api_router.include_router(esignature.router)

# Add more routers as needed
# api_router.include_router(onboarding.router)
