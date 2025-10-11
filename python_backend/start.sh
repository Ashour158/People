#!/bin/bash

# Render startup script for Python backend

echo "Starting HRMS Backend..."

# Set environment variables if not already set
export DATABASE_URL=${DATABASE_URL:-"sqlite:///./hr_system.db"}
export REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}
export JWT_SECRET_KEY=${JWT_SECRET_KEY:-"your-secret-key"}
export SECRET_KEY=${SECRET_KEY:-"your-secret-key"}
export ENVIRONMENT=${ENVIRONMENT:-"production"}

echo "Environment configured:"
echo "DATABASE_URL: $DATABASE_URL"
echo "ENVIRONMENT: $ENVIRONMENT"

# Start the application
echo "Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT
