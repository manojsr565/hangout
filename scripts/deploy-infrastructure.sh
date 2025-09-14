#!/bin/bash

# Terraform Infrastructure Deployment Script for Dating Planner
# This script automates the deployment of Azure infrastructure using Terraform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TERRAFORM_DIR="terraform"
TERRAFORM_VERSION="1.5.0"
REQUIRED_TOOLS=("terraform" "az")

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
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate prerequisites
validate_prerequisites() {
    print_status "info" "Validating prerequisites..."
    
    # Check required tools
    for tool in "${REQUIRED_TOOLS[@]}"; do
        if command_exists "$tool"; then
            case $tool in
                "terraform")
                    TERRAFORM_CURRENT_VERSION=$(terraform version -json | jq -r '.terraform_version' 2>/dev/null || terraform version | head -n1 | cut -d' ' -f2 | sed 's/v//')
                    print_status "success" "Terraform found: v$TERRAFORM_CURRENT_VERSION"
                    ;;
                "az")
                    AZ_VERSION=$(az version --output tsv --query '"azure-cli"' 2>/dev/null || echo "unknown")
                    print_status "success" "Azure CLI found: $AZ_VERSION"
                    ;;
            esac
        else
            print_status "error" "$tool not found. Please install $tool"
            exit 1
        fi
    done
    
    # Check Azure CLI authentication
    if ! az account show >/dev/null 2>&1; then
        print_status "error" "Not authenticated with Azure CLI. Run 'az login' first"
        exit 1
    else
        SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
        SUBSCRIPTION_ID=$(az account show --query id -o tsv)
        print_status "success" "Authenticated with Azure: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"
    fi
    
    # Check if terraform directory exists
    if [ ! -d "$TERRAFORM_DIR" ]; then
        print_status "error" "Terraform directory '$TERRAFORM_DIR' not found"
        exit 1
    fi
    
    print_status "success" "Prerequisites validation complete"
}

# Function to initialize Terraform
initialize_terraform() {
    print_status "info" "Initializing Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    if terraform init; then
        print_status "success" "Terraform initialized successfully"
    else
        print_status "error" "Terraform initialization failed"
        exit 1
    fi
    
    cd ..
}

# Function to validate Terraform configuration
validate_terraform() {
    print_status "info" "Validating Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    
    # Validate configuration
    if terraform validate; then
        print_status "success" "Terraform configuration is valid"
    else
        print_status "error" "Terraform configuration validation failed"
        exit 1
    fi
    
    # Format check
    if terraform fmt -check=true -diff=true; then
        print_status "success" "Terraform configuration is properly formatted"
    else
        print_status "warning" "Terraform configuration formatting issues found"
        print_status "info" "Run 'terraform fmt' to fix formatting"
    fi
    
    cd ..
}

# Function to check for terraform.tfvars
check_variables() {
    print_status "info" "Checking Terraform variables..."
    
    if [ -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
        print_status "success" "Found terraform.tfvars"
        
        # Check for required variables
        REQUIRED_VARS=("notification_email" "function_storage_account_name")
        
        for var in "${REQUIRED_VARS[@]}"; do
            if grep -q "^$var\s*=" "$TERRAFORM_DIR/terraform.tfvars"; then
                print_status "success" "Variable '$var' is configured"
            else
                print_status "warning" "Variable '$var' not found in terraform.tfvars"
            fi
        done
    else
        print_status "warning" "terraform.tfvars not found"
        print_status "info" "Copy terraform.tfvars.example to terraform.tfvars and configure"
        
        if [ -f "$TERRAFORM_DIR/terraform.tfvars.example" ]; then
            print_status "info" "Example file available at $TERRAFORM_DIR/terraform.tfvars.example"
        fi
    fi
}

# Function to plan Terraform deployment
plan_terraform() {
    print_status "info" "Creating Terraform execution plan..."
    
    cd "$TERRAFORM_DIR"
    
    # Create plan
    if terraform plan -out=tfplan; then
        print_status "success" "Terraform plan created successfully"
        
        # Show plan summary
        print_status "info" "Plan summary:"
        terraform show -no-color tfplan | grep -E "^(Plan:|No changes)" || true
    else
        print_status "error" "Terraform plan failed"
        exit 1
    fi
    
    cd ..
}

# Function to apply Terraform configuration
apply_terraform() {
    print_status "info" "Applying Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    
    # Apply the plan
    if terraform apply tfplan; then
        print_status "success" "Terraform apply completed successfully"
    else
        print_status "error" "Terraform apply failed"
        exit 1
    fi
    
    # Clean up plan file
    rm -f tfplan
    
    cd ..
}

# Function to show outputs
show_outputs() {
    print_status "info" "Terraform outputs:"
    
    cd "$TERRAFORM_DIR"
    
    # Show non-sensitive outputs
    terraform output -json | jq -r 'to_entries[] | select(.value.sensitive == false) | "\(.key): \(.value.value)"' 2>/dev/null || {
        print_status "warning" "Could not parse outputs as JSON, showing raw output:"
        terraform output
    }
    
    print_status "info" "Sensitive outputs (use 'terraform output <name>' to view):"
    terraform output -json | jq -r 'to_entries[] | select(.value.sensitive == true) | "- \(.key)"' 2>/dev/null || {
        print_status "info" "No sensitive outputs or jq not available"
    }
    
    cd ..
}

# Function to save deployment info
save_deployment_info() {
    print_status "info" "Saving deployment information..."
    
    cd "$TERRAFORM_DIR"
    
    # Create deployment info file
    cat > ../deployment-info.json << EOF
{
  "deployment_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "terraform_version": "$(terraform version -json | jq -r '.terraform_version' 2>/dev/null || echo 'unknown')",
  "azure_subscription": "$(az account show --query id -o tsv 2>/dev/null || echo 'unknown')",
  "resource_group": "$(terraform output -raw resource_group_name 2>/dev/null || echo 'unknown')",
  "static_web_app_url": "$(terraform output -raw static_web_app_url 2>/dev/null || echo 'unknown')",
  "function_app_name": "$(terraform output -raw function_app_name 2>/dev/null || echo 'unknown')"
}
EOF
    
    cd ..
    
    print_status "success" "Deployment info saved to deployment-info.json"
}

# Function to display next steps
show_next_steps() {
    echo ""
    print_status "info" "🎉 Infrastructure deployment complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "=============="
    echo ""
    echo "1. Get Static Web Apps deployment token:"
    echo "   - Go to Azure Portal"
    echo "   - Navigate to your Static Web App"
    echo "   - Go to 'Manage deployment token'"
    echo "   - Copy the token for Azure DevOps pipeline"
    echo ""
    echo "2. Configure Azure DevOps pipeline variables:"
    echo "   - AZURE_STATIC_WEB_APPS_API_TOKEN (from step 1)"
    echo "   - NOTIFICATION_EMAIL (your email address)"
    echo ""
    echo "3. Deploy applications:"
    echo "   - Run the application deployment pipeline"
    echo "   - Or use: npm run build && deploy manually"
    echo ""
    echo "4. Test the deployment:"
    echo "   - Visit the Static Web App URL"
    echo "   - Submit a test plan to verify email notifications"
    echo ""
    echo "📊 Deployment Information:"
    if [ -f "deployment-info.json" ]; then
        echo "   - Saved to: deployment-info.json"
        if command_exists jq; then
            echo "   - Static Web App URL: $(jq -r '.static_web_app_url' deployment-info.json)"
            echo "   - Resource Group: $(jq -r '.resource_group' deployment-info.json)"
        fi
    fi
    echo ""
    print_status "success" "Infrastructure is ready for application deployment!"
}

# Function to handle cleanup on error
cleanup_on_error() {
    print_status "error" "Deployment failed. Cleaning up..."
    
    if [ -f "$TERRAFORM_DIR/tfplan" ]; then
        rm -f "$TERRAFORM_DIR/tfplan"
        print_status "info" "Removed Terraform plan file"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --plan-only     Only create and show the Terraform plan (don't apply)"
    echo "  -y, --auto-approve  Skip interactive approval for apply"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Interactive deployment"
    echo "  $0 --plan-only      # Only show what would be deployed"
    echo "  $0 --auto-approve   # Deploy without confirmation"
}

# Main execution function
main() {
    local plan_only=false
    local auto_approve=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--plan-only)
                plan_only=true
                shift
                ;;
            -y|--auto-approve)
                auto_approve=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_status "error" "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Set up error handling
    trap cleanup_on_error ERR
    
    echo "🚀 Dating Planner Infrastructure Deployment"
    echo "==========================================="
    echo ""
    
    # Execute deployment steps
    validate_prerequisites
    echo ""
    
    check_variables
    echo ""
    
    initialize_terraform
    echo ""
    
    validate_terraform
    echo ""
    
    plan_terraform
    echo ""
    
    if [ "$plan_only" = true ]; then
        print_status "info" "Plan-only mode: Skipping apply step"
        cd "$TERRAFORM_DIR"
        rm -f tfplan
        cd ..
        exit 0
    fi
    
    # Confirmation for apply (unless auto-approved)
    if [ "$auto_approve" = false ]; then
        echo -n "Do you want to apply this Terraform plan? (yes/no): "
        read -r response
        if [[ ! "$response" =~ ^[Yy][Ee][Ss]$ ]]; then
            print_status "info" "Deployment cancelled by user"
            cd "$TERRAFORM_DIR"
            rm -f tfplan
            cd ..
            exit 0
        fi
    fi
    
    apply_terraform
    echo ""
    
    show_outputs
    echo ""
    
    save_deployment_info
    
    show_next_steps
}

# Run main function with all arguments
main "$@"