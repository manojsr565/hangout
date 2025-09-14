# Terraform Infrastructure for Dating Planner App

This directory contains Terraform configuration files to deploy the Azure infrastructure for the dating planner application.

## Prerequisites

1. **Azure CLI**: Install and login to Azure CLI
   ```bash
   az login
   ```

2. **Terraform**: Install Terraform CLI (version 1.0+)

3. **Azure Subscription**: Ensure you have an active Azure subscription with appropriate permissions

## Quick Start

1. **Initialize Terraform**:
   ```bash
   cd terraform
   terraform init
   ```

2. **Create variables file**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your specific values
   ```

3. **Plan the deployment**:
   ```bash
   terraform plan
   ```

4. **Apply the configuration**:
   ```bash
   terraform apply
   ```

## Resources Created

- **Resource Group**: Container for all resources
- **Static Web App**: Hosts the React application (Free tier)
- **Function App**: Serverless backend for email notifications (Consumption plan)
- **Storage Account**: Required for Function App
- **Service Plan**: Linux consumption plan for Function App
- **Communication Services**: Email service for notifications
- **Application Insights**: Monitoring and logging (Free tier)

## Important Notes

- The `function_storage_account_name` must be globally unique across Azure
- All resources use free or consumption tiers to minimize costs
- The Communication Services will need additional configuration for email domains
- Static Web App deployment tokens are output as sensitive values

## Outputs

After successful deployment, Terraform will output:
- Static Web App URL and API key
- Function App name and URL
- Communication Services connection string
- Application Insights keys

## Cleanup

To destroy all resources:
```bash
terraform destroy
```

## Cost Estimation

All resources are configured to use free tiers where available:
- Static Web Apps: Free tier (100GB bandwidth/month)
- Function App: Consumption plan (1M requests/month free)
- Communication Services: 250 emails/month free
- Application Insights: 5GB data/month free
- Storage Account: Pay-as-you-go (minimal usage expected)