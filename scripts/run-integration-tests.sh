#!/bin/bash

# Integration Test Runner Script
# This script runs all integration tests for the dating planner application

set -e  # Exit on any error

echo "🚀 Starting Integration Test Suite..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local working_dir="${3:-.}"
    
    echo -e "\n${BLUE}Running: $test_name${NC}"
    echo "Command: $test_command"
    echo "Working Directory: $working_dir"
    echo "----------------------------------------"
    
    if (cd "$working_dir" && eval "$test_command"); then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((TESTS_FAILED++))
        FAILED_TESTS+=("$test_name")
    fi
}

# 1. Pipeline Validation Tests
echo -e "\n${YELLOW}📋 Phase 1: Pipeline Validation Tests${NC}"
run_test "Pipeline Configuration Validation" "node scripts/pipeline-validation.test.js" "."

# 2. Backend Integration Tests
echo -e "\n${YELLOW}🔧 Phase 2: Backend Integration Tests${NC}"

# Install backend dependencies if needed
if [ ! -d "api/node_modules" ]; then
    echo "Installing backend dependencies..."
    run_test "Backend Dependency Installation" "npm ci" "api"
fi

# Run backend unit and integration tests
run_test "Backend Unit Tests" "npm test -- --testPathPattern='.*\.test\.ts$' --testPathIgnorePatterns='e2e\.integration\.test\.ts'" "api"
run_test "Backend Integration Tests" "npm test -- --testPathPattern='submitPlan\.integration\.test\.ts'" "api"
run_test "Backend E2E Tests" "npm test -- --testPathPattern='e2e\.integration\.test\.ts'" "api"

# 3. Frontend Integration Tests
echo -e "\n${YELLOW}🎨 Phase 3: Frontend Integration Tests${NC}"

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    run_test "Frontend Dependency Installation" "npm ci" "."
fi

# Run frontend tests
run_test "Frontend E2E Tests" "npm test -- --testPathPattern='e2e\.integration\.test\.tsx' --run" "."

# 4. Build Tests
echo -e "\n${YELLOW}🏗️ Phase 4: Build Validation Tests${NC}"
run_test "Frontend Build Test" "npm run build" "."
run_test "Backend Build Test" "npm run build" "api"

# 5. Health Check Tests (if services are running)
echo -e "\n${YELLOW}🏥 Phase 5: Health Check Tests${NC}"

# Check if we can test against running services
if command -v curl &> /dev/null; then
    # Test local development server if it's running
    if curl -f -s -o /dev/null "http://localhost:7071/api/health" 2>/dev/null; then
        run_test "Local API Health Check" "curl -f -s 'http://localhost:7071/api/health'" "."
    else
        echo -e "${YELLOW}⚠️  Local API server not running, skipping health check${NC}"
    fi
    
    # Test if frontend dev server is running
    if curl -f -s -o /dev/null "http://localhost:5173" 2>/dev/null; then
        run_test "Local Frontend Health Check" "curl -f -s 'http://localhost:5173'" "."
    else
        echo -e "${YELLOW}⚠️  Local frontend server not running, skipping health check${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  curl not available, skipping health checks${NC}"
fi

# 6. Security Tests
echo -e "\n${YELLOW}🔒 Phase 6: Security Validation Tests${NC}"

# Check for sensitive files that shouldn't be committed
run_test "Sensitive Files Check" "! find . -name '*.env' -not -path './node_modules/*' -not -name '*.example' | grep -q ." "."
run_test "Local Settings Check" "! find . -name 'local.settings.json' -not -path './node_modules/*' -not -name '*.example' | grep -q ." "."
run_test "Terraform State Check" "! find . -name 'terraform.tfstate*' -not -path './node_modules/*' | grep -q ." "."

# 7. Performance Tests (basic)
echo -e "\n${YELLOW}⚡ Phase 7: Basic Performance Tests${NC}"

# Test bundle sizes
if [ -d "dist" ]; then
    BUNDLE_SIZE=$(du -sh dist | cut -f1)
    echo "Frontend bundle size: $BUNDLE_SIZE"
    run_test "Frontend Bundle Size Check" "[ $(du -s dist | cut -f1) -lt 10240 ]" "."  # Less than 10MB
fi

if [ -d "api/dist" ]; then
    API_SIZE=$(du -sh api/dist | cut -f1)
    echo "API bundle size: $API_SIZE"
    run_test "API Bundle Size Check" "[ $(du -s api/dist | cut -f1) -lt 5120 ]" "api"  # Less than 5MB
fi

# 8. Documentation Tests
echo -e "\n${YELLOW}📚 Phase 8: Documentation Validation${NC}"
run_test "README Exists" "[ -f README.md ]" "."
run_test "API Documentation Exists" "[ -f api/README.md ]" "."
run_test "Environment Config Documentation" "[ -f ENVIRONMENT_CONFIG.md ]" "."
run_test "Pipeline Setup Documentation" "[ -f PIPELINE_SETUP.md ]" "."

# Summary
echo -e "\n${BLUE}=================================="
echo "🏁 Integration Test Suite Complete"
echo "==================================${NC}"

echo -e "\n📊 Test Results Summary:"
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "\n${RED}🔍 Failed Tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "${RED}   • $test${NC}"
    done
    
    echo -e "\n${RED}❌ Integration test suite failed!${NC}"
    echo "Please fix the failing tests before deploying."
    exit 1
else
    echo -e "\n${GREEN}🎉 All integration tests passed!${NC}"
    echo -e "${GREEN}✅ Your application is ready for deployment.${NC}"
    
    # Optional: Generate test report
    if command -v jq &> /dev/null; then
        echo -e "\n📄 Generating test report..."
        cat > test-report.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "total_tests": $((TESTS_PASSED + TESTS_FAILED)),
  "passed": $TESTS_PASSED,
  "failed": $TESTS_FAILED,
  "success_rate": $(echo "scale=2; $TESTS_PASSED * 100 / ($TESTS_PASSED + $TESTS_FAILED)" | bc -l 2>/dev/null || echo "100")"%",
  "status": "$([ $TESTS_FAILED -eq 0 ] && echo "PASSED" || echo "FAILED")"
}
EOF
        echo "Test report saved to: test-report.json"
    fi
fi

echo -e "\n${BLUE}Integration test suite completed at $(date)${NC}"