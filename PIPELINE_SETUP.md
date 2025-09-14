# Azure DevOps Pipeline Setup Guide

This guide explains how to set up the Azure DevOps pipelines for the Dating Planner application.

## Pipeline Files

Three pipeline configurations are provided:

1. **`azure-pipelines.yml`** - Main application pipeline (build and deploy apps)
2. **`azure-pipelines-infrastructure.yml`** - Infrastructure-only pipeline (Terraform)
3. **`azure-pipelines-complete.yml`** - Complete pipeline (infrastructure + applications)

## Prerequisites

### 1. Azure DevOps Project
- Create an Azure DevOps project
- Import or connect your Git repository

### 2. Azure Service Connection
- Create an Azure Resource Manager service connection in Azure DevOps
- Name it appropriately (e.g., "Azure-Production")
- Ensure it has Contributor permissions on your Azure subscription

### 3. Environment Configuration
- Review `ENVIRONMENT_CONFIG.md` for complete environment setup guide
- Understand the difference between local development and production configuration

### 4. Required Variables

Set up the following pipeline variables in Azure DevOps:

#### Service Connections
- `AZURE_SERVICE_CONNECTION` - Name of your Azure service connection

#### API Tokens
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Deployment token from Static Web Apps (get from Azure portal)

## Setup Steps

### Step 1: Create Service Connection
1. Go to Project Settings → Service connections
2. Create new Azure Resource Manager connection
3. Choose "Service principal (automatic)"
4. Select your subscription and resource group
5. Name it (e.g., "Azure-Production")

### Step 2: Configure Pipeline Variables
1. Go to Pipelines → Library → Variable groups
2. Create variable group named `dating-planner-secrets`
3. Add required variables (see ENVIRONMENT_CONFIG.md for complete list):
   ```
   AZURE_SERVICE_CONNECTION: "Azure-Production"
   NOTIFICATION_EMAIL: "your-email@example.com" (mark as secret)
   ```

### Step 3: Get Static Web Apps Deployment Token
1. Deploy infrastructure first using Terraform
2. Go to Azure Portal → Your Static Web App
3. Navigate to "Manage deployment token"
4. Copy the deployment token
5. Add to variable group as `AZURE_STATIC_WEB_APPS_API_TOKEN` (mark as secret)

### Step 4: Create Pipeline
1. Go to Pipelines → New pipeline
2. Choose your repository
3. Select "Existing Azure Pipelines YAML file"
4. Choose one of the pipeline files:
   - For complete workflow: `azure-pipelines-complete.yml`
   - For separate pipelines: `azure-pipelines.yml` and `azure-pipelines-infrastructure.yml`

## Pipeline Options

### Option 1: Complete Pipeline (Recommended)
Use `azure-pipelines-complete.yml` for a single pipeline that:
- Deploys infrastructure with Terraform
- Builds React frontend and Azure Functions backend
- Deploys both applications
- Runs validation tests

### Option 2: Separate Pipelines
Use separate pipelines for more control:
- `azure-pipelines-infrastructure.yml` for infrastructure changes
- `azure-pipelines.yml` for application deployments

## Environment Configuration

### Environments
The pipelines use Azure DevOps environments for deployment approvals:
- `production` - For application deployments
- `infrastructure-production` - For infrastructure changes

Create these environments in Azure DevOps:
1. Go to Pipelines → Environments
2. Create new environment
3. Add approval gates if desired

### Branch Protection
The pipelines are configured to:
- Trigger on `main` branch pushes
- Run PR validation on pull requests to `main`
- Only deploy from `main` branch

## Terraform Backend Configuration

For infrastructure pipeline, you may need to configure Terraform backend:

1. **Option 1: Local State (Simple)**
   - Remove backend configuration from Terraform
   - State stored in pipeline artifacts

2. **Option 2: Azure Storage Backend (Recommended)**
   - Create storage account for Terraform state
   - Update `azure-pipelines-infrastructure.yml` with storage details

## Troubleshooting

### Common Issues

1. **Service Connection Permissions**
   - Ensure service principal has Contributor role
   - Check resource group permissions

2. **Static Web Apps Token**
   - Token expires - regenerate in Azure portal
   - Ensure token is for correct Static Web App

3. **Function App Deployment**
   - Check Function App exists (deployed by Terraform)
   - Verify Node.js runtime version matches

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify package.json scripts exist
   - Review build logs for specific errors

### Pipeline Validation
Test your pipeline setup:
1. Make a small change to README.md
2. Commit to a feature branch
3. Create pull request to main
4. Verify PR validation runs
5. Merge to main and verify full deployment

## Security Considerations

- Store sensitive variables as secrets in Azure DevOps
- Use managed identities where possible
- Regularly rotate service principal credentials
- Review pipeline permissions and approvals

## Next Steps

After pipeline setup:
1. Test the complete workflow
2. Set up monitoring and alerts
3. Configure backup strategies
4. Document operational procedures