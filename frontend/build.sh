#!/bin/bash

# Render build script for React frontend

echo "Installing Node.js dependencies..."
npm ci

echo "Building React application..."
npm run build

echo "Frontend build completed successfully!"
