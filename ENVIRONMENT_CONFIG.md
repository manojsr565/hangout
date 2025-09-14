# Environment Configuration Guide

This document outlines the environment configuration and secrets management for the Dating Planner application.

## Overview

The application uses environment variables to configure:
- Azure Function App settings
- Communication Services for email notifications
- Application Insights for monitoring
- Azure DevOps pipeline variables and secrets

## Environment Variables

### Function App Configuration

#### Required Variables
| Variable | Description | Example | Source |
|----------|-------------|---------|--------|
| `FUNCTIONS_WORKER_RUNTIME` | Azure Functions runtime | `node` | Static |
| `WEBSITE_NODE_DEFAULT_VERSION` | Node.js version | `~18` | Static |
| `COMMUNICATION_SERVICES_CONNECTION_STRING` | Azure Communication Services connection | `endpoint=https://...` | Terraform Output |
| `EMAIL_FROM_ADDRESS` | Sender email address | `DoNotReply@domain.azurecomm.net` | Terraform Generated |
| `EMAIL_TO_ADDRESS` | Notification recipient | `your-email@example.com` | Pipeline Variable |
| `APPINSIGHTS_INSTRUMENTATIONKEY` | Application Insights key | `guid` | Terraform Output |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Application Insights connection | `InstrumentationKey=...` | Terraform Output |

#### Optional Variables
| Variable | Description | Default | Purpose |
|----------|-------------|---------|---------|
| `WEBSITE_RUN_FROM_PACKAGE` | Run from deployment package | `1` | Performance |
| `WEBSITE_ENABLE_SYNC_UPDATE_SITE` | Enable sync updates | `true` | Deployment |

### Local Development Configuration

#### api/local.settings.json
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "WEBSITE_NODE_DEFAULT_VERSION": "~18",
    "COMMUNICATION_SERVICES_CONNECTION_STRING": "endpoint=https://your-service.communication.azure.com/;accesskey=your-key",
    "EMAIL_FROM_ADDRESS": "DoNotReply@your-service.azurecomm.net",
    "EMAIL_TO_ADDRESS": "your-email@example.com",
    "APPINSIGHTS_INSTRUMENTATIONKEY": "your-instrumentation-key",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "InstrumentationKey=your-key;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/"
  }
}
```

## Azure DevOps Configuration

### Service Connections

#### Azure Resource Manager Connection
- **Name**: `Azure-Production`
- **Type**: Service Principal (automatic)
- **Scope**: Subscription or Resource Group
- **Permissions**: Contributor role

### Variable Groups

#### dating-planner-secrets
Create this variable group with the following variables:

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `AZURE_SERVICE_CONNECTION` | Variable | Service connection name | Yes |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Secret | Static Web Apps deployment token | Yes |
| `NOTIFICATION_EMAIL` | Secret | Email for notifications | Yes |
| `EMAIL_FROM_DOMAIN` | Variable | Custom email domain (optional) | No |

### Pipeline Variables

#### Built-in Variables
```yaml
variables:
  nodeVersion: '18.x'
  terraformVersion: '1.5.0'
  azureServiceConnection: $(AZURE_SERVICE_CONNECTION)
  resourceGroupName: 'rg-dating-planner'
  staticWebAppName: 'swa-dating-planner'
  functionAppName: 'func-dating-planner'
```

## Terraform Configuration

### Input Variables
```hcl
variable "notification_email" {
  description = "Email address to receive notifications"
  type        = string
  default     = "your-email@example.com"
}
```

### Output Values
```hcl
output "communication_service_connection_string" {
  description = "Connection string for Communication Services"
  value       = azurerm_communication_service.email.primary_connection_string
  sensitive   = true
}

output "static_web_app_api_key" {
  description = "API key for Static Web App deployment"
  value       = azurerm_static_site.app.api_key
  sensitive   = true
}
```

## Setup Instructions

### 1. Local Development Setup

1. **Copy configuration template**:
   ```bash
   cp api/local.settings.example.json api/local.settings.json
   ```

2. **Configure local settings**:
   - Update `COMMUNICATION_SERVICES_CONNECTION_STRING` with your Azure Communication Services connection string
   - Set `EMAIL_TO_ADDRESS` to your email address
   - Configure Application Insights keys if needed

3. **Validate configuration**:
   ```bash
   ./scripts/setup-environment.sh
   ```

### 2. Azure DevOps Setup

1. **Create Service Connection**:
   - Go to Project Settings → Service connections
   - Create Azure Resource Manager connection
   - Name it `Azure-Production`
   - Grant Contributor permissions

2. **Create Variable Group**:
   - Go to Pipelines → Library → Variable groups
   - Create `dating-planner-secrets`
   - Add required variables (mark secrets appropriately)

3. **Get Static Web Apps Token**:
   - Deploy infrastructure first
   - Go to Azure Portal → Static Web App → Manage deployment token
   - Copy token to `AZURE_STATIC_WEB_APPS_API_TOKEN`

### 3. Infrastructure Deployment

1. **Configure Terraform variables**:
   ```bash
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Deploy via pipeline**:
   - Pipeline automatically passes `notification_email` from Azure DevOps variable
   - Terraform outputs are used to configure Function App

## Security Best Practices

### Secret Management
- ✅ Store sensitive values as secrets in Azure DevOps
- ✅ Use Azure Key Vault integration for enhanced security
- ✅ Mark Terraform outputs as sensitive
- ✅ Never commit secrets to source control

### Access Control
- ✅ Use least privilege principle for service connections
- ✅ Limit pipeline access to variable groups
- ✅ Regular audit of permissions and access
- ✅ Use managed identities where possible

### Monitoring
- ✅ Enable Application Insights for Function App
- ✅ Monitor secret usage and access
- ✅ Set up alerts for deployment failures
- ✅ Regular security reviews

## Troubleshooting

### Common Issues

#### Local Development
- **Issue**: Function app not starting locally
- **Solution**: Check `local.settings.json` format and required variables

- **Issue**: Email not sending in local development
- **Solution**: Verify Communication Services connection string and permissions

#### Pipeline Deployment
- **Issue**: Service connection authentication failure
- **Solution**: Verify service principal permissions and expiration

- **Issue**: Static Web Apps deployment token invalid
- **Solution**: Regenerate token in Azure Portal

- **Issue**: Function App environment variables not set
- **Solution**: Check Terraform outputs and pipeline variable configuration

### Validation Commands

```bash
# Validate local configuration
./scripts/setup-environment.sh

# Test Function App locally
cd api && npm start

# Validate Terraform configuration
cd terraform && terraform validate

# Check Azure CLI authentication
az account show
```

## Environment Differences

### Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Storage | Development Storage | Azure Storage Account |
| Email | Test/Console output | Azure Communication Services |
| Monitoring | Optional | Application Insights enabled |
| Authentication | Local keys | Managed Identity (future) |
| Secrets | Local files | Azure DevOps/Key Vault |

## Migration and Updates

### Updating Environment Variables
1. Update Terraform configuration
2. Apply infrastructure changes
3. Redeploy Function App
4. Validate configuration

### Rotating Secrets
1. Generate new secrets in Azure
2. Update Azure DevOps variables
3. Redeploy applications
4. Verify functionality
5. Remove old secrets

### Adding New Variables
1. Add to Terraform `app_settings`
2. Update `local.settings.example.json`
3. Document in this guide
4. Update validation scripts