.PHONY: help setup install clean build dev test lint format typecheck validate docker-up docker-down db-setup db-migrate db-seed

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo '$(BLUE)People HR Management System - Available Commands$(NC)'
	@echo ''
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ''

setup: ## Initial project setup (install dependencies for both frontend and backend)
	@echo '$(BLUE)Setting up project...$(NC)'
	@make install
	@make db-setup
	@echo '$(GREEN)Setup complete!$(NC)'

install: ## Install dependencies
	@echo '$(BLUE)Installing backend dependencies...$(NC)'
	cd backend && npm install
	@echo '$(BLUE)Installing frontend dependencies...$(NC)'
	cd frontend && npm install
	@echo '$(GREEN)Dependencies installed!$(NC)'

clean: ## Clean build artifacts and dependencies
	@echo '$(YELLOW)Cleaning build artifacts...$(NC)'
	rm -rf backend/dist
	rm -rf frontend/dist
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf backend/coverage
	rm -rf frontend/coverage
	@echo '$(GREEN)Clean complete!$(NC)'

build: ## Build both frontend and backend
	@echo '$(BLUE)Building backend...$(NC)'
	cd backend && npm run build
	@echo '$(BLUE)Building frontend...$(NC)'
	cd frontend && npm run build
	@echo '$(GREEN)Build complete!$(NC)'

dev-backend: ## Start backend development server
	@echo '$(BLUE)Starting backend dev server...$(NC)'
	cd backend && npm run dev

dev-frontend: ## Start frontend development server
	@echo '$(BLUE)Starting frontend dev server...$(NC)'
	cd frontend && npm run dev

dev: ## Start both frontend and backend in development mode (requires tmux or run in separate terminals)
	@echo '$(YELLOW)Note: This requires running in separate terminals or using tmux$(NC)'
	@echo '$(BLUE)Run these commands in separate terminals:$(NC)'
	@echo '  make dev-backend'
	@echo '  make dev-frontend'

test: ## Run tests for both frontend and backend
	@echo '$(BLUE)Running backend tests...$(NC)'
	cd backend && npm test
	@echo '$(BLUE)Running frontend tests...$(NC)'
	cd frontend && npm test
	@echo '$(GREEN)Tests complete!$(NC)'

test-backend: ## Run backend tests with coverage
	@echo '$(BLUE)Running backend tests...$(NC)'
	cd backend && npm run test

test-frontend: ## Run frontend tests with coverage
	@echo '$(BLUE)Running frontend tests...$(NC)'
	cd frontend && npm run test:coverage

test-watch: ## Run tests in watch mode
	@echo '$(BLUE)Starting test watch mode...$(NC)'
	@echo 'Backend: cd backend && npm run test:watch'
	@echo 'Frontend: cd frontend && npm run test:watch'

lint: ## Lint both frontend and backend
	@echo '$(BLUE)Linting backend...$(NC)'
	cd backend && npm run lint
	@echo '$(BLUE)Linting frontend...$(NC)'
	cd frontend && npm run lint
	@echo '$(GREEN)Lint complete!$(NC)'

lint-fix: ## Fix linting issues
	@echo '$(BLUE)Fixing backend lint issues...$(NC)'
	cd backend && npm run lint:fix
	@echo '$(BLUE)Fixing frontend lint issues...$(NC)'
	cd frontend && npm run lint:fix
	@echo '$(GREEN)Lint fix complete!$(NC)'

format: ## Format code with Prettier
	@echo '$(BLUE)Formatting backend code...$(NC)'
	cd backend && npm run format
	@echo '$(BLUE)Formatting frontend code...$(NC)'
	cd frontend && npm run format
	@echo '$(GREEN)Format complete!$(NC)'

format-check: ## Check code formatting
	@echo '$(BLUE)Checking backend formatting...$(NC)'
	cd backend && npm run format:check
	@echo '$(BLUE)Checking frontend formatting...$(NC)'
	cd frontend && npm run format:check
	@echo '$(GREEN)Format check complete!$(NC)'

typecheck: ## Type check TypeScript code
	@echo '$(BLUE)Type checking backend...$(NC)'
	cd backend && npm run typecheck
	@echo '$(BLUE)Type checking frontend...$(NC)'
	cd frontend && npm run typecheck
	@echo '$(GREEN)Type check complete!$(NC)'

validate: ## Run all validations (lint, typecheck, test)
	@echo '$(BLUE)Running full validation...$(NC)'
	@make lint
	@make typecheck
	@make test
	@echo '$(GREEN)Validation complete!$(NC)'

docker-up: ## Start all services with Docker Compose
	@echo '$(BLUE)Starting Docker services...$(NC)'
	docker-compose up -d
	@echo '$(GREEN)Services started!$(NC)'
	@echo 'Backend: http://localhost:8000'
	@echo 'Frontend: http://localhost:3000'
	@echo 'PostgreSQL: localhost:5432'

docker-down: ## Stop all Docker services
	@echo '$(YELLOW)Stopping Docker services...$(NC)'
	docker-compose down
	@echo '$(GREEN)Services stopped!$(NC)'

docker-logs: ## Show Docker logs
	docker-compose logs -f

docker-build: ## Rebuild Docker images
	@echo '$(BLUE)Building Docker images...$(NC)'
	docker-compose build
	@echo '$(GREEN)Build complete!$(NC)'

db-setup: ## Setup database (create database and run schema)
	@echo '$(BLUE)Setting up database...$(NC)'
	createdb hr_system || true
	psql hr_system < enhanced_hr_schema.sql
	@echo '$(GREEN)Database setup complete!$(NC)'

db-migrate: ## Run database migrations
	@echo '$(BLUE)Running migrations...$(NC)'
	cd backend && npm run migrate
	@echo '$(GREEN)Migrations complete!$(NC)'

db-seed: ## Seed database with sample data
	@echo '$(BLUE)Seeding database...$(NC)'
	cd backend && npm run seed
	@echo '$(GREEN)Database seeded!$(NC)'

db-reset: ## Reset database (drop and recreate)
	@echo '$(YELLOW)Resetting database...$(NC)'
	dropdb hr_system || true
	@make db-setup
	@echo '$(GREEN)Database reset complete!$(NC)'

db-console: ## Open PostgreSQL console
	psql hr_system

start: ## Start production servers
	@echo '$(BLUE)Starting production servers...$(NC)'
	cd backend && npm start &
	cd frontend && npm run preview &
	@echo '$(GREEN)Servers started!$(NC)'

stop: ## Stop all running processes
	@echo '$(YELLOW)Stopping all processes...$(NC)'
	pkill -f "node dist/server.js" || true
	pkill -f "vite preview" || true
	@echo '$(GREEN)Processes stopped!$(NC)'

logs-backend: ## Show backend logs
	tail -f backend/logs/combined.log

logs-frontend: ## Show frontend console
	@echo 'Open browser console to see frontend logs'

check-env: ## Check if environment variables are set
	@echo '$(BLUE)Checking environment variables...$(NC)'
	@test -f backend/.env || (echo '$(YELLOW)Warning: backend/.env not found$(NC)' && exit 1)
	@test -f frontend/.env || (echo '$(YELLOW)Warning: frontend/.env not found$(NC)' && exit 1)
	@echo '$(GREEN)Environment files exist!$(NC)'

create-env: ## Create .env files from examples
	@echo '$(BLUE)Creating environment files...$(NC)'
	@test -f backend/.env || cp backend/.env.example backend/.env
	@test -f frontend/.env || cp frontend/.env.example frontend/.env
	@echo '$(GREEN)Environment files created!$(NC)'
	@echo '$(YELLOW)Please edit .env files with your configuration$(NC)'

update-deps: ## Update dependencies to latest versions
	@echo '$(BLUE)Updating backend dependencies...$(NC)'
	cd backend && npm update
	@echo '$(BLUE)Updating frontend dependencies...$(NC)'
	cd frontend && npm update
	@echo '$(GREEN)Dependencies updated!$(NC)'

audit: ## Run security audit
	@echo '$(BLUE)Auditing backend dependencies...$(NC)'
	cd backend && npm audit
	@echo '$(BLUE)Auditing frontend dependencies...$(NC)'
	cd frontend && npm audit

audit-fix: ## Fix security vulnerabilities
	@echo '$(BLUE)Fixing backend vulnerabilities...$(NC)'
	cd backend && npm audit fix
	@echo '$(BLUE)Fixing frontend vulnerabilities...$(NC)'
	cd frontend && npm audit fix
	@echo '$(GREEN)Vulnerabilities fixed!$(NC)'

ci: ## Run CI pipeline locally
	@echo '$(BLUE)Running CI pipeline...$(NC)'
	@make install
	@make lint
	@make typecheck
	@make test
	@make build
	@echo '$(GREEN)CI pipeline complete!$(NC)'

docs: ## Generate documentation
	@echo '$(BLUE)Generating documentation...$(NC)'
	@echo 'Documentation available in:'
	@echo '  README.md'
	@echo '  CONTRIBUTING.md'
	@echo '  api_documentation.md'
	@echo '  docs/adr/'

info: ## Show project information
	@echo '$(BLUE)Project Information$(NC)'
	@echo 'Name: People HR Management System'
	@echo 'Version: 1.0.0'
	@echo 'Description: Enterprise-grade HR Management System'
	@echo ''
	@echo '$(BLUE)Technology Stack$(NC)'
	@echo 'Backend: Django 4.2+ + Python 3.9+ + Django REST Framework + PostgreSQL 13+'
	@echo 'Frontend: React 18 + TypeScript + Vite + Material-UI'
	@echo 'Database: PostgreSQL 13+'
	@echo 'Cache: Redis 7+'
	@echo ''
	@echo '$(BLUE)Quick Start$(NC)'
	@echo '1. make setup       - Initial setup'
	@echo '2. make create-env  - Create environment files'
	@echo '3. make dev-backend - Start backend (terminal 1)'
	@echo '4. make dev-frontend - Start frontend (terminal 2)'

