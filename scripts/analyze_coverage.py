#!/usr/bin/env python3
"""
Test Coverage Analysis Tool
Analyzes the current test coverage and provides recommendations
"""

import os
import subprocess
import json
from pathlib import Path

def count_files(directory, extensions):
    """Count files with specific extensions"""
    count = 0
    for ext in extensions:
        count += len(list(Path(directory).rglob(f'*{ext}')))
    return count

def count_test_files(directory):
    """Count test files"""
    test_patterns = ['test_*.py', '*_test.py', '*.test.ts', '*.spec.ts']
    count = 0
    for pattern in test_patterns:
        count += len(list(Path(directory).rglob(pattern)))
    return count

def analyze_python_backend():
    """Analyze Python backend"""
    backend_dir = 'python_backend'
    
    if not os.path.exists(backend_dir):
        return None
    
    # Count source files
    source_files = count_files(f'{backend_dir}/app', ['.py'])
    
    # Count test files
    test_files = count_test_files(f'{backend_dir}/tests') if os.path.exists(f'{backend_dir}/tests') else 0
    
    # Count API endpoints
    endpoint_count = 0
    if os.path.exists(f'{backend_dir}/app/api/v1/endpoints'):
        for file in Path(f'{backend_dir}/app/api/v1/endpoints').glob('*.py'):
            with open(file, 'r') as f:
                content = f.read()
                endpoint_count += content.count('@router.')
    
    return {
        'name': 'Python Backend (FastAPI)',
        'source_files': source_files,
        'test_files': test_files,
        'api_endpoints': endpoint_count,
        'test_ratio': round(test_files / source_files * 100, 1) if source_files > 0 else 0,
        'status': 'PRIMARY' if source_files > 50 else 'SECONDARY'
    }

def analyze_typescript_backend():
    """Analyze TypeScript backend"""
    backend_dir = 'backend'
    
    if not os.path.exists(f'{backend_dir}/src'):
        return None
    
    # Count source files
    source_files = count_files(f'{backend_dir}/src', ['.ts', '.js'])
    
    # Count test files
    test_files = count_test_files(backend_dir)
    
    # Count controllers (proxy for endpoints)
    controller_count = count_files(f'{backend_dir}/src/controllers', ['.ts'])
    
    return {
        'name': 'TypeScript Backend (Node.js)',
        'source_files': source_files,
        'test_files': test_files,
        'controllers': controller_count,
        'test_ratio': round(test_files / source_files * 100, 1) if source_files > 0 else 0,
        'status': 'LEGACY' if source_files < 100 else 'ACTIVE'
    }

def analyze_frontend():
    """Analyze frontend"""
    frontend_dir = 'frontend'
    
    if not os.path.exists(f'{frontend_dir}/src'):
        return None
    
    # Count source files
    source_files = count_files(f'{frontend_dir}/src', ['.tsx', '.ts', '.jsx', '.js'])
    
    # Count test files
    test_files = count_test_files(frontend_dir)
    
    # Count components
    component_count = 0
    if os.path.exists(f'{frontend_dir}/src/components'):
        component_count = count_files(f'{frontend_dir}/src/components', ['.tsx', '.jsx'])
    
    # Count pages
    page_count = 0
    if os.path.exists(f'{frontend_dir}/src/pages'):
        page_count = count_files(f'{frontend_dir}/src/pages', ['.tsx', '.jsx'])
    
    return {
        'name': 'Frontend (React + TypeScript)',
        'source_files': source_files,
        'test_files': test_files,
        'components': component_count,
        'pages': page_count,
        'test_ratio': round(test_files / source_files * 100, 1) if source_files > 0 else 0
    }

def analyze_database():
    """Analyze database schemas"""
    sql_files = list(Path('.').rglob('*.sql'))
    
    total_lines = 0
    table_count = 0
    
    for sql_file in sql_files:
        with open(sql_file, 'r') as f:
            content = f.read()
            total_lines += len(content.split('\n'))
            table_count += content.upper().count('CREATE TABLE')
    
    return {
        'name': 'Database Schemas',
        'sql_files': len(sql_files),
        'total_lines': total_lines,
        'estimated_tables': table_count
    }

def count_documentation():
    """Count documentation files"""
    md_files = list(Path('.').glob('*.md'))
    
    total_words = 0
    for md_file in md_files:
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
                total_words += len(content.split())
        except:
            pass
    
    return {
        'name': 'Documentation',
        'markdown_files': len(md_files),
        'estimated_words': total_words,
        'estimated_pages': round(total_words / 500)  # ~500 words per page
    }

def generate_report():
    """Generate comprehensive analysis report"""
    print("=" * 80)
    print("HR MANAGEMENT SYSTEM - TEST COVERAGE & IMPLEMENTATION ANALYSIS")
    print("=" * 80)
    print()
    
    # Analyze components
    python_backend = analyze_python_backend()
    ts_backend = analyze_typescript_backend()
    frontend = analyze_frontend()
    database = analyze_database()
    docs = count_documentation()
    
    # Backend Analysis
    print("📦 BACKEND ANALYSIS")
    print("-" * 80)
    
    if python_backend:
        print(f"\n{python_backend['name']} [{python_backend['status']}]")
        print(f"  • Source Files: {python_backend['source_files']}")
        print(f"  • Test Files: {python_backend['test_files']}")
        print(f"  • API Endpoints: {python_backend['api_endpoints']}")
        print(f"  • Test Coverage Ratio: {python_backend['test_ratio']}% (Target: 80%)")
        
        coverage_status = "❌ CRITICAL" if python_backend['test_ratio'] < 30 else \
                         "⚠️  NEEDS IMPROVEMENT" if python_backend['test_ratio'] < 60 else \
                         "✅ GOOD" if python_backend['test_ratio'] < 80 else "🎉 EXCELLENT"
        print(f"  • Status: {coverage_status}")
    
    if ts_backend:
        print(f"\n{ts_backend['name']} [{ts_backend['status']}]")
        print(f"  • Source Files: {ts_backend['source_files']}")
        print(f"  • Test Files: {ts_backend['test_files']}")
        print(f"  • Controllers: {ts_backend['controllers']}")
        print(f"  • Test Coverage Ratio: {ts_backend['test_ratio']}% (Target: 80%)")
        
        if ts_backend['status'] == 'LEGACY':
            print(f"  • ⚠️  RECOMMENDATION: Consider phasing out in favor of Python backend")
    
    # Frontend Analysis
    print(f"\n\n📱 FRONTEND ANALYSIS")
    print("-" * 80)
    
    if frontend:
        print(f"\n{frontend['name']}")
        print(f"  • Source Files: {frontend['source_files']}")
        print(f"  • Test Files: {frontend['test_files']}")
        print(f"  • Components: {frontend['components']}")
        print(f"  • Pages: {frontend['pages']}")
        print(f"  • Test Coverage Ratio: {frontend['test_ratio']}% (Target: 70%)")
        
        coverage_status = "❌ CRITICAL" if frontend['test_ratio'] < 20 else \
                         "⚠️  NEEDS IMPROVEMENT" if frontend['test_ratio'] < 50 else \
                         "✅ GOOD" if frontend['test_ratio'] < 70 else "🎉 EXCELLENT"
        print(f"  • Status: {coverage_status}")
    
    # Database Analysis
    print(f"\n\n🗄️  DATABASE ANALYSIS")
    print("-" * 80)
    
    if database:
        print(f"\n{database['name']}")
        print(f"  • SQL Files: {database['sql_files']}")
        print(f"  • Total Lines: {database['total_lines']:,}")
        print(f"  • Estimated Tables: {database['estimated_tables']}")
        print(f"  • Migration Framework: {'❌ NOT SET UP (Alembic needed)' if not os.path.exists('python_backend/alembic') else '✅ Alembic configured'}")
    
    # Documentation Analysis
    print(f"\n\n📚 DOCUMENTATION ANALYSIS")
    print("-" * 80)
    
    if docs:
        print(f"\n{docs['name']}")
        print(f"  • Markdown Files: {docs['markdown_files']}")
        print(f"  • Estimated Words: {docs['estimated_words']:,}")
        print(f"  • Estimated Pages: {docs['estimated_pages']}")
        
        doc_status = "❌ INSUFFICIENT" if docs['markdown_files'] < 10 else \
                     "⚠️  NEEDS ORGANIZATION" if docs['markdown_files'] > 30 else "✅ GOOD"
        print(f"  • Status: {doc_status}")
        
        if docs['markdown_files'] > 30:
            print(f"  • ⚠️  RECOMMENDATION: Consolidate documentation into organized structure")
    
    # Overall Summary
    print(f"\n\n🎯 OVERALL ASSESSMENT")
    print("=" * 80)
    
    total_source = (python_backend['source_files'] if python_backend else 0) + \
                   (ts_backend['source_files'] if ts_backend else 0) + \
                   (frontend['source_files'] if frontend else 0)
    
    total_tests = (python_backend['test_files'] if python_backend else 0) + \
                  (ts_backend['test_files'] if ts_backend else 0) + \
                  (frontend['test_files'] if frontend else 0)
    
    overall_test_ratio = round(total_tests / total_source * 100, 1) if total_source > 0 else 0
    
    print(f"\nTotal Source Files: {total_source}")
    print(f"Total Test Files: {total_tests}")
    print(f"Overall Test Ratio: {overall_test_ratio}% (Target: 75%)")
    
    # Recommendations
    print(f"\n\n💡 TOP RECOMMENDATIONS")
    print("=" * 80)
    
    recommendations = []
    
    if python_backend and python_backend['test_ratio'] < 60:
        recommendations.append(
            f"1. 🔴 CRITICAL: Increase Python backend test coverage from {python_backend['test_ratio']}% to 80%"
        )
    
    if frontend and frontend['test_ratio'] < 50:
        recommendations.append(
            f"2. 🔴 CRITICAL: Increase frontend test coverage from {frontend['test_ratio']}% to 70%"
        )
    
    if not os.path.exists('python_backend/alembic'):
        recommendations.append(
            "3. 🔴 CRITICAL: Set up Alembic database migration framework"
        )
    
    if ts_backend and ts_backend['source_files'] > 50:
        recommendations.append(
            "4. 🟡 HIGH: Create migration plan to phase out TypeScript backend"
        )
    
    if docs and docs['markdown_files'] > 30:
        recommendations.append(
            "5. 🟡 MEDIUM: Consolidate and reorganize documentation"
        )
    
    if not recommendations:
        recommendations.append("✅ All critical metrics are in good standing!")
    
    for rec in recommendations:
        print(rec)
    
    print(f"\n\n📈 NEXT STEPS")
    print("=" * 80)
    print("""
Week 1:
  • Set up pytest/Jest testing infrastructure
  • Write tests for authentication module (target: 100%)
  • Set up Alembic for database migrations
  • Begin test coverage tracking in CI/CD

Week 2-3:
  • Achieve 50% overall test coverage
  • Write integration tests for all API endpoints
  • Complete database migration setup
  • Document testing standards

Week 4:
  • Achieve 80% coverage on critical paths
  • Load testing and performance optimization
  • Security audit and penetration testing
  • Deploy to staging environment

For detailed action items, see: QUICK_ACTION_GUIDE.md
For comprehensive analysis, see: COMPREHENSIVE_INTEGRATION_ANALYSIS.md
    """)
    
    print("=" * 80)
    print("Analysis complete! Review recommendations above.")
    print("=" * 80)

if __name__ == "__main__":
    try:
        generate_report()
    except Exception as e:
        print(f"Error during analysis: {e}")
        print("Please ensure you're running this script from the project root directory.")
