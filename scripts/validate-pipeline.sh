#!/bin/bash

# Pipeline Validation Script
# This script validates that the pipeline configuration is correct

set -e

echo "🔍 Validating Azure DevOps Pipeline Configuration..."

# Check if required files exist
echo "📁 Checking pipeline files..."
required_files=(
    "azure-pipelines.yml"
    "azure-pipelines-complete.yml" 
    "azure-pipelines-infrastructure.yml"
    "package.json"
    "api/package.json"
    "terraform/main.tf"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

# Validate package.json scripts
echo "📦 Validating package.json scripts..."
if jq -e '.scripts.build' package.json > /dev/null; then
    echo "✅ Frontend build script exists"
else
    echo "❌ Frontend build script missing"
    exit 1
fi

if jq -e '.scripts.build' api/package.json > /dev/null; then
    echo "✅ Backend build script exists"
else
    echo "❌ Backend build script missing"
    exit 1
fi

if jq -e '.scripts.test' api/package.json > /dev/null; then
    echo "✅ Backend test script exists"
else
    echo "❌ Backend test script missing"
    exit 1
fi

# Validate Terraform configuration
echo "🏗️ Validating Terraform configuration..."
if command -v terraform &> /dev/null; then
    cd terraform
    if terraform validate; then
        echo "✅ Terraform configuration is valid"
    else
        echo "❌ Terraform configuration has errors"
        exit 1
    fi
    cd ..
else
    echo "⚠️ Terraform not installed - skipping validation"
fi

# Check YAML syntax
echo "📝 Validating YAML syntax..."
yaml_files=(
    "azure-pipelines.yml"
    "azure-pipelines-complete.yml"
    "azure-pipelines-infrastructure.yml"
)

for file in "${yaml_files[@]}"; do
    if command -v yamllint &> /dev/null; then
        if yamllint "$file"; then
            echo "✅ $file has valid YAML syntax"
        else
            echo "❌ $file has YAML syntax errors"
            exit 1
        fi
    else
        # Basic YAML check using Python
        if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
            echo "✅ $file has valid YAML syntax"
        else
            echo "❌ $file has YAML syntax errors"
            exit 1
        fi
    fi
done

# Check for required environment variables in pipeline
echo "🔧 Checking pipeline variable references..."
required_vars=(
    "AZURE_SERVICE_CONNECTION"
    "AZURE_STATIC_WEB_APPS_API_TOKEN"
)

for var in "${required_vars[@]}"; do
    if grep -q "$var" azure-pipelines*.yml; then
        echo "✅ $var is referenced in pipeline"
    else
        echo "❌ $var is not referenced in pipeline"
        exit 1
    fi
done

echo ""
echo "🎉 Pipeline validation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Set up Azure DevOps service connection"
echo "2. Configure pipeline variables"
echo "3. Create pipeline from azure-pipelines-complete.yml"
echo "4. Test with a small commit"
echo ""
echo "See PIPELINE_SETUP.md for detailed instructions."