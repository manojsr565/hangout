#!/bin/bash

# CI Integration Test Runner
# Simplified version for CI/CD pipelines without interactive features

set -e

echo "Running Integration Tests in CI Mode..."

# Backend tests
echo "Running backend integration tests..."
cd api
npm ci
npm test
cd ..

# Frontend tests  
echo "Running frontend integration tests..."
npm ci
npm test -- --run --passWithNoTests

# Pipeline validation
echo "Running pipeline validation..."
npm run test:pipeline

# Build validation
echo "Validating builds..."
npm run build
cd api && npm run build && cd ..

echo "✅ All integration tests passed in CI mode!"