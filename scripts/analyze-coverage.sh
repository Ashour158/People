#!/bin/bash

# Test Coverage Analysis and Improvement Script
# This script analyzes test coverage and suggests areas for improvement

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}→ $1${NC}"
}

print_header "HR Management System - Test Coverage Analysis"

# Check if we're in the right directory
if [ ! -d "python_backend" ] || [ ! -d "frontend" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# ============= Backend Coverage Analysis =============
print_header "Backend (Python) Coverage Analysis"

cd python_backend

if [ ! -f "pytest" ] && ! command -v pytest &> /dev/null; then
    print_warning "pytest not found. Installing..."
    pip install -q pytest pytest-cov pytest-asyncio
fi

print_info "Running backend tests with coverage..."

# Run tests with coverage
pytest --cov=app --cov-report=term-missing --cov-report=html --cov-report=json -q 2>&1 | tee coverage_output.txt

# Extract coverage percentage
if [ -f "coverage.json" ]; then
    BACKEND_COVERAGE=$(python3 -c "import json; data=json.load(open('coverage.json')); print(f\"{data['totals']['percent_covered']:.1f}\")" 2>/dev/null || echo "0")
    
    echo ""
    print_info "Backend Coverage: ${BACKEND_COVERAGE}%"
    
    # Check against targets
    if (( $(echo "$BACKEND_COVERAGE < 30" | bc -l) )); then
        print_error "Coverage is below 30% target"
    elif (( $(echo "$BACKEND_COVERAGE < 50" | bc -l) )); then
        print_warning "Coverage is below 50% target"
    elif (( $(echo "$BACKEND_COVERAGE < 80" | bc -l) )); then
        print_warning "Coverage is below 80% final target"
    else
        print_success "Coverage meets or exceeds 80% target!"
    fi
    
    # Analyze uncovered files
    print_info "Analyzing uncovered code..."
    python3 << 'EOF'
import json
import sys

try:
    with open('coverage.json') as f:
        data = json.load(f)
    
    print("\n📊 Coverage by Module:")
    print("-" * 60)
    
    files_coverage = []
    for file, metrics in data['files'].items():
        if 'app/' in file and '__pycache__' not in file:
            coverage = metrics['summary']['percent_covered']
            files_coverage.append((file, coverage))
    
    # Sort by coverage (lowest first)
    files_coverage.sort(key=lambda x: x[1])
    
    # Show files with lowest coverage
    print("\n🔴 Files with lowest coverage (need attention):")
    for file, coverage in files_coverage[:10]:
        file_short = file.replace('app/', '')
        print(f"  {coverage:5.1f}%  {file_short}")
    
    # Show files with good coverage
    if len(files_coverage) > 10:
        print("\n🟢 Files with highest coverage:")
        for file, coverage in files_coverage[-5:]:
            file_short = file.replace('app/', '')
            print(f"  {coverage:5.1f}%  {file_short}")
    
    # Calculate category coverage
    categories = {}
    for file, coverage in files_coverage:
        if '/endpoints/' in file:
            cat = 'API Endpoints'
        elif '/models/' in file:
            cat = 'Models'
        elif '/services/' in file:
            cat = 'Services'
        elif '/utils/' in file:
            cat = 'Utils'
        else:
            cat = 'Other'
        
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(coverage)
    
    print("\n📈 Coverage by Category:")
    print("-" * 60)
    for cat, coverages in sorted(categories.items()):
        avg_coverage = sum(coverages) / len(coverages)
        print(f"  {cat:20s}  {avg_coverage:5.1f}%  ({len(coverages)} files)")

except Exception as e:
    print(f"Error analyzing coverage: {e}", file=sys.stderr)
EOF

else
    print_error "Coverage report not generated"
fi

cd ..

# ============= Frontend Coverage Analysis =============
print_header "Frontend (React) Coverage Analysis"

cd frontend

if [ ! -d "node_modules" ]; then
    print_warning "Node modules not found. Run 'npm install' first."
    cd ..
    exit 0
fi

print_info "Running frontend tests with coverage..."

# Run tests with coverage
npm run test:coverage -- --reporter=verbose 2>&1 | tee coverage_output.txt || true

# Check if coverage report exists
if [ -f "coverage/coverage-summary.json" ]; then
    FRONTEND_COVERAGE=$(node -e "const c = require('./coverage/coverage-summary.json'); console.log(c.total.lines.pct.toFixed(1));" 2>/dev/null || echo "0")
    
    echo ""
    print_info "Frontend Coverage: ${FRONTEND_COVERAGE}%"
    
    # Check against targets
    if (( $(echo "$FRONTEND_COVERAGE < 30" | bc -l) )); then
        print_error "Coverage is below 30% target"
    elif (( $(echo "$FRONTEND_COVERAGE < 50" | bc -l) )); then
        print_warning "Coverage is below 50% target"
    elif (( $(echo "$FRONTEND_COVERAGE < 70" | bc -l) )); then
        print_warning "Coverage is below 70% final target"
    else
        print_success "Coverage meets or exceeds 70% target!"
    fi
    
    print_info "Analyzing uncovered components..."
    node << 'EOF'
const coverage = require('./coverage/coverage-summary.json');

console.log('\n📊 Coverage by File Type:');
console.log('-'.repeat(60));

const categories = {
    components: [],
    pages: [],
    hooks: [],
    utils: [],
    stores: [],
    other: []
};

for (const [file, metrics] of Object.entries(coverage)) {
    if (file === 'total') continue;
    
    const coverage = metrics.lines.pct;
    
    if (file.includes('/components/')) {
        categories.components.push({ file, coverage });
    } else if (file.includes('/pages/')) {
        categories.pages.push({ file, coverage });
    } else if (file.includes('/hooks/')) {
        categories.hooks.push({ file, coverage });
    } else if (file.includes('/utils/')) {
        categories.utils.push({ file, coverage });
    } else if (file.includes('/store/')) {
        categories.stores.push({ file, coverage });
    } else {
        categories.other.push({ file, coverage });
    }
}

for (const [category, files] of Object.entries(categories)) {
    if (files.length > 0) {
        const avgCoverage = files.reduce((sum, f) => sum + f.coverage, 0) / files.length;
        console.log(`  ${category.padEnd(20)}  ${avgCoverage.toFixed(1).padStart(5)}%  (${files.length} files)`);
        
        // Show lowest coverage files in this category
        files.sort((a, b) => a.coverage - b.coverage);
        if (files.length > 0 && files[0].coverage < 50) {
            console.log(`    ⚠️  Lowest: ${files[0].file.split('/').pop()} (${files[0].coverage.toFixed(1)}%)`);
        }
    }
}

console.log('\n🔴 Components needing tests (< 30% coverage):');
const allFiles = [...categories.components, ...categories.pages, ...categories.hooks];
allFiles.sort((a, b) => a.coverage - b.coverage);
const needTests = allFiles.filter(f => f.coverage < 30).slice(0, 10);

if (needTests.length === 0) {
    console.log('  ✅ No files with critically low coverage!');
} else {
    needTests.forEach(f => {
        const fileName = f.file.split('/').pop();
        console.log(`  ${f.coverage.toFixed(1).padStart(5)}%  ${fileName}`);
    });
}
EOF

else
    print_warning "Frontend coverage report not generated"
fi

cd ..

# ============= Summary and Recommendations =============
print_header "Summary and Recommendations"

echo "📊 Coverage Status:"
echo "  Backend:  ${BACKEND_COVERAGE:-N/A}%  (Target: 80%)"
echo "  Frontend: ${FRONTEND_COVERAGE:-N/A}%  (Target: 70%)"
echo ""

print_info "Next Steps:"
echo ""
echo "1. Focus on files with < 30% coverage"
echo "2. Add unit tests for utility functions and models"
echo "3. Add integration tests for API endpoints"
echo "4. Add component tests for React components"
echo "5. Run tests regularly during development"
echo ""

print_info "Quick Commands:"
echo ""
echo "  Run backend tests:   cd python_backend && pytest"
echo "  Run frontend tests:  cd frontend && npm test"
echo "  Run E2E tests:       cd frontend && npm run test:e2e"
echo "  Run all tests:       ./scripts/run-all-tests.sh"
echo ""

print_header "Coverage Analysis Complete"

# Open coverage reports
print_info "Coverage reports available at:"
echo "  Backend:  python_backend/htmlcov/index.html"
echo "  Frontend: frontend/coverage/index.html"
echo ""

# Ask if user wants to open reports
if command -v xdg-open &> /dev/null; then
    read -p "Open coverage reports in browser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open python_backend/htmlcov/index.html 2>/dev/null || true
        xdg-open frontend/coverage/index.html 2>/dev/null || true
    fi
elif command -v open &> /dev/null; then
    read -p "Open coverage reports in browser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open python_backend/htmlcov/index.html 2>/dev/null || true
        open frontend/coverage/index.html 2>/dev/null || true
    fi
fi
