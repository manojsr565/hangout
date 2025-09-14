# Azure DevOps Configuration for Dating Planner

## Required Service Connections

### 1. Azure Resource Manager Service Connection
- **Name**: `Azure-Production`
- **Type**: Azure Resource Manager
- **Authentication**: Service Principal (automatic)
- **Scope**: Subscription level
- **Required Permissions**: Contributor role on subscription or resource group

## Required Pipeline Variables

### Variable Groups
Create a variable group named `dating-planner-secrets` with the following variables:

#### Service Connection Variables
- `AZURE_SERVICE_CONNECTION`: `Azure-Production`

#### Azure Static Web Apps Variables
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: (Secret) - Get from Azure Portal after Terraform deployment

#### Email Configuration Variables
- `NOTIFICATION_EMAIL`: (Secret) - Email address to receive plan notifications
- `EMAIL_FROM_DOMAIN`: (Optional) - Custom domain for sending emails

#### Environment Variables
- `ENVIRONMENT`: `prod`
- `AZURE_REGION`: `East US`

### Pipeline-Specific Variables
Set these variables directly in each pipeline:

#### Infrastructure Pipeline Variables
```yaml
variables:
  terraformVersion: '1.5.0'
  azureServiceConnection: $(AZURE_SERVICE_CONNECTION)
  resourceGroupName: 'rg-dating-planner'
  environment: 'prod'
```

#### Application Pipeline Variables
```yaml
variables:
  nodeVersion: '18.x'
  azureServiceConnection: $(AZURE_SERVICE_CONNECTION)
  staticWebAppName: 'swa-dating-planner'
  functionAppName: 'func-dating-planner'
```

## Setup Instructions

### Step 1: Create Service Connection
1. Navigate to Project Settings → Service connections
2. Click "New service connection"
3. Select "Azure Resource Manager"
4. Choose "Service principal (automatic)"
5. Select your Azure subscription
6. Choose resource group scope: `rg-dating-planner`
7. Name: `Azure-Production`
8. Grant access permission to all pipelines
9. Click "Save"

### Step 2: Create Variable Group
1. Navigate to Pipelines → Library
2. Click "Variable group"
3. Name: `dating-planner-secrets`
4. Add variables as listed above
5. Mark sensitive variables as "Secret"
6. Link to Azure Key Vault (optional, for enhanced security)
7. Set pipeline permissions

### Step 3: Get Static Web Apps Deployment Token
After Terraform deployment:
1. Go to Azure Portal
2. Navigate to your Static Web App resource
3. Go to "Overview" → "Manage deployment token"
4. Copy the deployment token
5. Add to `AZURE_STATIC_WEB_APPS_API_TOKEN` variable (mark as secret)

### Step 4: Configure Pipeline Security
1. Navigate to Pipelines → Your pipeline → Edit
2. Go to "Variables" tab
3. Link variable group: `dating-planner-secrets`
4. Set variable group permissions
5. Configure environment approvals if needed

## Environment Configuration

### Production Environment
Create environment named `production`:
1. Navigate to Pipelines → Environments
2. Click "New environment"
3. Name: `production`
4. Add approval gates (optional):
   - Required reviewers
   - Business hours restrictions
   - Deployment protection rules

### Infrastructure Environment
Create environment named `infrastructure-production`:
1. Navigate to Pipelines → Environments
2. Click "New environment"
3. Name: `infrastructure-production`
4. Add approval gates for infrastructure changes

## Security Best Practices

### Secret Management
- Store all sensitive values as secrets in variable groups
- Use Azure Key Vault integration for enhanced security
- Rotate secrets regularly
- Limit pipeline access to secrets

### Service Principal Security
- Use least privilege principle
- Regularly review and rotate credentials
- Monitor service principal usage
- Use managed identities where possible

### Pipeline Security
- Enable branch protection on main branch
- Require pull request reviews
- Use environment approvals for production deployments
- Audit pipeline permissions regularly

## Troubleshooting

### Common Issues

#### Service Connection Failures
- Verify service principal has correct permissions
- Check subscription and resource group access
- Ensure service connection is not expired

#### Variable Access Issues
- Verify variable group is linked to pipeline
- Check variable group permissions
- Ensure secrets are properly marked

#### Deployment Token Issues
- Regenerate token in Azure Portal if expired
- Verify token is for correct Static Web App
- Check token format and special characters

### Validation Steps
1. Test service connection in Azure DevOps
2. Run pipeline with dry-run/validation mode
3. Verify all variables are accessible in pipeline logs
4. Test deployment to staging environment first