#!/bin/bash

# Render build script for Python backend

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Creating necessary directories..."
mkdir -p uploads logs

echo "Setting up database..."
# Database setup will be handled by Render's database service

echo "Build completed successfully!"
