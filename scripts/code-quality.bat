@echo off
REM Code Quality Check Script for HRMS Project (Windows)
REM This script runs all code quality checks for both frontend and backend

echo 🔍 Starting Code Quality Checks...
echo ==================================

REM Check if we're in the project root
if not exist "docker-compose.yml" (
    echo [ERROR] Please run this script from the project root directory
    exit /b 1
)

REM Initialize counters
set FRONTEND_ERRORS=0
set BACKEND_ERRORS=0
set TOTAL_ERRORS=0

echo.
echo [INFO] 🎯 Frontend Code Quality Checks
echo ==================================

REM Frontend checks
if exist "frontend" (
    cd frontend
    
    REM Install dependencies if needed
    if not exist "node_modules" (
        echo [INFO] Installing frontend dependencies...
        call npm ci
    )
    
    REM ESLint check
    echo [INFO] Running ESLint...
    call npm run lint
    if %errorlevel% neq 0 (
        echo [ERROR] ESLint failed
        set /a FRONTEND_ERRORS+=1
    ) else (
        echo [SUCCESS] ESLint passed
    )
    
    REM Prettier check
    echo [INFO] Running Prettier check...
    call npm run format:check
    if %errorlevel% neq 0 (
        echo [WARNING] Prettier formatting issues found
        echo [INFO] Run 'npm run format' to fix formatting issues
        set /a FRONTEND_ERRORS+=1
    ) else (
        echo [SUCCESS] Prettier formatting is correct
    )
    
    REM TypeScript check
    echo [INFO] Running TypeScript check...
    call npm run typecheck
    if %errorlevel% neq 0 (
        echo [ERROR] TypeScript check failed
        set /a FRONTEND_ERRORS+=1
    ) else (
        echo [SUCCESS] TypeScript check passed
    )
    
    REM Tests
    echo [INFO] Running frontend tests...
    call npm run test
    if %errorlevel% neq 0 (
        echo [ERROR] Frontend tests failed
        set /a FRONTEND_ERRORS+=1
    ) else (
        echo [SUCCESS] Frontend tests passed
    )
    
    cd ..
) else (
    echo [WARNING] Frontend directory not found, skipping frontend checks
)

echo.
echo [INFO] 🐍 Backend Code Quality Checks
echo ==================================

REM Backend checks
if exist "python_backend" (
    cd python_backend
    
    REM Install dependencies if needed
    if not exist ".venv" (
        echo [INFO] Creating Python virtual environment...
        python -m venv .venv
        call .venv\Scripts\activate.bat
        pip install -r requirements.txt
        pip install black ruff mypy pytest-cov
    ) else (
        call .venv\Scripts\activate.bat
    )
    
    REM Black formatting check
    echo [INFO] Running Black formatting check...
    call black --check app/ tests/
    if %errorlevel% neq 0 (
        echo [WARNING] Black formatting issues found
        echo [INFO] Run 'black app/ tests/' to fix formatting issues
        set /a BACKEND_ERRORS+=1
    ) else (
        echo [SUCCESS] Black formatting is correct
    )
    
    REM Ruff linting
    echo [INFO] Running Ruff linting...
    call ruff check app/ tests/
    if %errorlevel% neq 0 (
        echo [ERROR] Ruff linting failed
        set /a BACKEND_ERRORS+=1
    ) else (
        echo [SUCCESS] Ruff linting passed
    )
    
    REM MyPy type checking
    echo [INFO] Running MyPy type checking...
    call mypy app/
    if %errorlevel% neq 0 (
        echo [WARNING] MyPy type checking issues found
        set /a BACKEND_ERRORS+=1
    ) else (
        echo [SUCCESS] MyPy type checking passed
    )
    
    REM Pytest tests
    echo [INFO] Running backend tests...
    call pytest tests/ -v --tb=short
    if %errorlevel% neq 0 (
        echo [ERROR] Backend tests failed
        set /a BACKEND_ERRORS+=1
    ) else (
        echo [SUCCESS] Backend tests passed
    )
    
    cd ..
) else (
    echo [WARNING] Python backend directory not found, skipping backend checks
)

REM Calculate total errors
set /a TOTAL_ERRORS=%FRONTEND_ERRORS%+%BACKEND_ERRORS%

echo.
echo ==================================
echo [INFO] 📊 Code Quality Summary
echo ==================================

if %FRONTEND_ERRORS%==0 (
    echo [SUCCESS] Frontend: All checks passed ✅
) else (
    echo [ERROR] Frontend: %FRONTEND_ERRORS% issues found ❌
)

if %BACKEND_ERRORS%==0 (
    echo [SUCCESS] Backend: All checks passed ✅
) else (
    echo [ERROR] Backend: %BACKEND_ERRORS% issues found ❌
)

echo.
if %TOTAL_ERRORS%==0 (
    echo [SUCCESS] 🎉 All code quality checks passed!
    echo.
    echo [INFO] Code Quality Score: 10/10 ⭐⭐⭐⭐⭐⭐⭐⭐⭐
    exit /b 0
) else (
    echo [ERROR] ❌ Code quality issues found: %TOTAL_ERRORS% total
    echo.
    echo [INFO] Code Quality Score: %((10 - TOTAL_ERRORS))/10
    echo.
    echo [INFO] 🔧 To fix issues:
    echo   Frontend: cd frontend ^&^& npm run lint:fix ^&^& npm run format
    echo   Backend: cd python_backend ^&^& black app/ tests/ ^&^& ruff check --fix app/ tests/
    exit /b 1
)
