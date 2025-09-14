#!/bin/bash

# Environment Setup Script for Dating Planner
# This script helps validate and set up the environment configuration

set -e

echo "🚀 Dating Planner Environment Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "warning")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "error")
            echo -e "${RED}✗${NC} $message"
            ;;
        "info")
            echo -e "ℹ $message"
            ;;
    esac
}

# Check if running in Azure DevOps
if [ -n "$AZURE_HTTP_USER_AGENT" ]; then
    print_status "info" "Running in Azure DevOps pipeline"
    ENVIRONMENT="pipeline"
else
    print_status "info" "Running in local environment"
    ENVIRONMENT="local"
fi

# Validate required tools
print_status "info" "Checking required tools..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "success" "Node.js found: $NODE_VERSION"
else
    print_status "error" "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "success" "npm found: $NPM_VERSION"
else
    print_status "error" "npm not found"
    exit 1
fi

# Check Azure CLI (if not in pipeline)
if [ "$ENVIRONMENT" = "local" ]; then
    if command -v az &> /dev/null; then
        AZ_VERSION=$(az --version | head -n 1)
        print_status "success" "Azure CLI found: $AZ_VERSION"
    else
        print_status "warning" "Azure CLI not found. Install for local Azure operations"
    fi
fi

# Validate environment variables
print_status "info" "Validating environment configuration..."

# Required variables for Function App
REQUIRED_VARS=(
    "FUNCTIONS_WORKER_RUNTIME"
    "COMMUNICATION_SERVICES_CONNECTION_STRING"
    "EMAIL_TO_ADDRESS"
)

# Check if local.settings.json exists for local development
if [ "$ENVIRONMENT" = "local" ] && [ -f "api/local.settings.json" ]; then
    print_status "success" "Found api/local.settings.json"
    
    # Validate local.settings.json structure
    if command -v jq &> /dev/null; then
        if jq empty api/local.settings.json 2>/dev/null; then
            print_status "success" "local.settings.json is valid JSON"
            
            # Check for required values
            for var in "${REQUIRED_VARS[@]}"; do
                if jq -e ".Values.\"$var\"" api/local.settings.json > /dev/null 2>&1; then
                    value=$(jq -r ".Values.\"$var\"" api/local.settings.json)
                    if [ "$value" != "" ] && [ "$value" != "null" ]; then
                        print_status "success" "$var is configured"
                    else
                        print_status "warning" "$var is empty in local.settings.json"
                    fi
                else
                    print_status "warning" "$var not found in local.settings.json"
                fi
            done
        else
            print_status "error" "local.settings.json is not valid JSON"
        fi
    else
        print_status "warning" "jq not found, skipping JSON validation"
    fi
elif [ "$ENVIRONMENT" = "local" ]; then
    print_status "warning" "api/local.settings.json not found"
    print_status "info" "Copy api/local.settings.example.json to api/local.settings.json and configure"
fi

# Pipeline-specific validation
if [ "$ENVIRONMENT" = "pipeline" ]; then
    print_status "info" "Validating pipeline environment variables..."
    
    # Check Azure DevOps variables
    if [ -n "$AZURE_SERVICE_CONNECTION" ]; then
        print_status "success" "AZURE_SERVICE_CONNECTION is set"
    else
        print_status "error" "AZURE_SERVICE_CONNECTION not set"
    fi
    
    if [ -n "$AZURE_STATIC_WEB_APPS_API_TOKEN" ]; then
        print_status "success" "AZURE_STATIC_WEB_APPS_API_TOKEN is set"
    else
        print_status "warning" "AZURE_STATIC_WEB_APPS_API_TOKEN not set (required for deployment)"
    fi
    
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        print_status "success" "NOTIFICATION_EMAIL is set"
    else
        print_status "warning" "NOTIFICATION_EMAIL not set"
    fi
fi

# Validate Terraform configuration
if [ -f "terraform/terraform.tfvars.example" ]; then
    print_status "success" "Found terraform.tfvars.example"
    
    if [ -f "terraform/terraform.tfvars" ]; then
        print_status "success" "Found terraform.tfvars"
    else
        print_status "warning" "terraform.tfvars not found (copy from example for local use)"
    fi
else
    print_status "warning" "terraform.tfvars.example not found"
fi

# Check project structure
print_status "info" "Validating project structure..."

REQUIRED_FILES=(
    "package.json"
    "api/package.json"
    "terraform/main.tf"
    "terraform/variables.tf"
    "azure-pipelines-complete.yml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "success" "Found $file"
    else
        print_status "error" "Missing $file"
    fi
done

# Validate package.json scripts
if [ -f "package.json" ]; then
    if command -v jq &> /dev/null; then
        if jq -e '.scripts.build' package.json > /dev/null 2>&1; then
            print_status "success" "Frontend build script found"
        else
            print_status "warning" "Frontend build script not found in package.json"
        fi
    fi
fi

if [ -f "api/package.json" ]; then
    if command -v jq &> /dev/null; then
        if jq -e '.scripts.build' api/package.json > /dev/null 2>&1; then
            print_status "success" "Backend build script found"
        else
            print_status "warning" "Backend build script not found in api/package.json"
        fi
    fi
fi

print_status "info" "Environment validation complete!"

# Provide next steps
echo ""
echo "📋 Next Steps:"
echo "=============="

if [ "$ENVIRONMENT" = "local" ]; then
    echo "For local development:"
    echo "1. Copy api/local.settings.example.json to api/local.settings.json"
    echo "2. Configure your Communication Services connection string"
    echo "3. Set your notification email address"
    echo "4. Run 'npm install' in both root and api directories"
    echo "5. Run 'npm run dev' to start local development"
    echo ""
    echo "For Azure deployment:"
    echo "1. Set up Azure DevOps service connection"
    echo "2. Configure pipeline variables as documented in azure-devops-setup.md"
    echo "3. Run the infrastructure pipeline first"
    echo "4. Get Static Web Apps deployment token from Azure Portal"
    echo "5. Run the complete pipeline"
else
    echo "Pipeline environment detected:"
    echo "1. Ensure all required variables are configured in Azure DevOps"
    echo "2. Verify service connection permissions"
    echo "3. Check that Terraform state is properly managed"
    echo "4. Monitor deployment logs for any issues"
fi

echo ""
print_status "success" "Setup validation complete!"