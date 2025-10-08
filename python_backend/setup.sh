#!/bin/bash

# Quick start script for Python HR Management System

set -e

echo "🚀 Starting Python HR Management System Setup..."

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration"
fi

# Create uploads directory
mkdir -p uploads

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database and Redis configuration"
echo "2. Create PostgreSQL database: createdb hr_system"
echo "3. Run the application: uvicorn app.main:app --reload --port 5000"
echo ""
echo "Or use Docker:"
echo "  docker-compose up -d"
echo ""
echo "API Documentation will be available at: http://localhost:5000/api/v1/docs"
