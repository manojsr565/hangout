# Troubleshooting Guide

This guide covers common issues and solutions for the Dating Planner application deployment and operation.

## 🔍 Quick Diagnostics

### Environment Validation
Run the environment validation script to check your setup:
```bash
./scripts/setup-environment.sh
```

### Check Application Status
```bash
# Check Azure resources
az resource list --resource-group rg-dating-planner --output table

# Check Function App status
az functionapp show --name func-dating-planner --resource-group rg-dating-planner --query "state"

# Check Static Web App status
az staticwebapp show --name swa-dating-planner --resource-group rg-dating-planner --query "defaultHostname"
```

## 🏗️ Infrastructure Issues

### Terraform Deployment Problems

#### Issue: Terraform initialization fails
**Symptoms:**
- `terraform init` command fails
- Provider download errors
- Backend configuration issues

**Solutions:**
```bash
# Clear Terraform cache and reinitialize
rm -rf terraform/.terraform
cd terraform && terraform init

# Check Terraform version compatibility
terraform version

# Verify Azure CLI authentication
az account show
```

#### Issue: Resource name conflicts
**Symptoms:**
- "Resource already exists" errors
- Storage account name conflicts
- Static Web App name conflicts

**Solutions:**
```bash
# Update terraform.tfvars with unique names
# Storage account names must be globally unique
function_storage_account_name = "stdatingplanner$(date +%s)"

# Check existing resources
az storage account check-name --name your-storage-name
az staticwebapp list --query "[].name"
```

#### Issue: Insufficient permissions
**Symptoms:**
- "Authorization failed" errors
- "Forbidden" responses during deployment
- Service principal permission errors

**Solutions:**
```bash
# Check current Azure account and permissions
az account show
az role assignment list --assignee $(az account show --query user.name -o tsv)

# Ensure Contributor role on subscription or resource group
az role assignment create --assignee $(az account show --query user.name -o tsv) \
  --role Contributor --scope /subscriptions/$(az account show --query id -o tsv)
```

### Azure Resource Issues

#### Issue: Communication Services not sending emails
**Symptoms:**
- Function executes successfully but no emails received
- Email service connection errors
- Authentication failures

**Solutions:**
```bash
# Verify Communication Services configuration
az communication list --resource-group rg-dating-planner

# Check connection string format
# Should be: endpoint=https://your-service.communication.azure.com/;accesskey=your-key

# Test email domain configuration
az communication email domain list --email-service-name your-service --resource-group rg-dating-planner
```

#### Issue: Function App deployment failures
**Symptoms:**
- Function App exists but functions not deployed
- Runtime errors in Function App
- Package deployment issues

**Solutions:**
```bash
# Check Function App configuration
az functionapp config show --name func-dating-planner --resource-group rg-dating-planner

# Verify runtime settings
az functionapp config appsettings list --name func-dating-planner --resource-group rg-dating-planner

# Check deployment status
az functionapp deployment list-publishing-profiles --name func-dating-planner --resource-group rg-dating-planner
```

## 🔧 Development Issues

### Local Development Problems

#### Issue: Azure Functions not starting locally
**Symptoms:**
- `npm start` fails in api directory
- "Host not found" errors
- Port binding issues

**Solutions:**
```bash
# Check local.settings.json exists and is valid
cd api
cat local.settings.json | jq .

# Verify Azure Functions Core Tools installation
func --version

# Check for port conflicts
lsof -i :7071
netstat -an | grep 7071

# Start with verbose logging
func start --verbose
```

#### Issue: Frontend not connecting to backend
**Symptoms:**
- API calls failing in development
- CORS errors
- Network connection errors

**Solutions:**
```bash
# Check API configuration
cat config/api.ts

# Verify backend is running
curl http://localhost:7071/api/health

# Check for CORS configuration in Function App
# local.settings.json should have:
{
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

#### Issue: Environment variables not loading
**Symptoms:**
- Configuration errors
- Missing environment variables
- Function execution failures

**Solutions:**
```bash
# Validate local.settings.json structure
cd api
node -e "console.log(JSON.parse(require('fs').readFileSync('local.settings.json', 'utf8')))"

# Check required variables
grep -E "(COMMUNICATION_SERVICES|EMAIL_)" local.settings.json

# Verify environment loading in function
# Add logging to function to check process.env
```

### Build and Deployment Issues

#### Issue: Frontend build failures
**Symptoms:**
- `npm run build` fails
- TypeScript compilation errors
- Missing dependencies

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version compatibility
node --version
# Should be 18.x or higher

# Build with verbose output
npm run build -- --verbose

# Check for TypeScript errors
npx tsc --noEmit
```

#### Issue: Backend build failures
**Symptoms:**
- TypeScript compilation errors in api/
- Missing dependencies
- Function packaging issues

**Solutions:**
```bash
cd api

# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript configuration
npx tsc --noEmit

# Build manually
npm run build

# Check function.json files
find . -name "function.json" -exec cat {} \;
```

## 🚀 Pipeline Issues

### Azure DevOps Pipeline Problems

#### Issue: Service connection authentication failures
**Symptoms:**
- "Service connection not found" errors
- Authentication failures in pipeline
- Permission denied errors

**Solutions:**
```bash
# Verify service connection in Azure DevOps
# Go to Project Settings → Service connections
# Test the connection

# Check service principal permissions
az ad sp show --id your-service-principal-id
az role assignment list --assignee your-service-principal-id

# Regenerate service principal credentials if needed
```

#### Issue: Static Web Apps deployment token issues
**Symptoms:**
- "Invalid deployment token" errors
- Token authentication failures
- Deployment not triggering

**Solutions:**
```bash
# Get new deployment token from Azure Portal
# Go to Static Web App → Manage deployment token
# Copy token to Azure DevOps variable: AZURE_STATIC_WEB_APPS_API_TOKEN

# Verify token format (should be long alphanumeric string)
# Ensure token is marked as "Secret" in Azure DevOps
```

#### Issue: Pipeline variable access problems
**Symptoms:**
- Variables not available in pipeline
- "Variable not found" errors
- Empty variable values

**Solutions:**
```yaml
# Check variable group linking in pipeline YAML
variables:
- group: dating-planner-secrets

# Verify variable group permissions
# Go to Pipelines → Library → Variable groups
# Check pipeline permissions

# Test variable access in pipeline
- script: echo "$(VARIABLE_NAME)"
  displayName: 'Test variable access'
```

### Deployment Validation Issues

#### Issue: Application not accessible after deployment
**Symptoms:**
- Static Web App URL returns 404
- Function App not responding
- DNS resolution issues

**Solutions:**
```bash
# Check Static Web App status
az staticwebapp show --name swa-dating-planner --resource-group rg-dating-planner

# Verify deployment status
az staticwebapp list-secrets --name swa-dating-planner --resource-group rg-dating-planner

# Check Function App health
curl https://func-dating-planner.azurewebsites.net/api/health

# Verify DNS resolution
nslookup your-static-web-app-url.azurestaticapps.net
```

## 📧 Email Notification Issues

### Communication Services Problems

#### Issue: Emails not being sent
**Symptoms:**
- Function executes but no email received
- Email service errors in logs
- Authentication failures

**Solutions:**
```bash
# Check Communication Services status
az communication list --resource-group rg-dating-planner

# Verify email domain configuration
az communication email domain list --email-service-name your-service --resource-group rg-dating-planner

# Check connection string in Function App settings
az functionapp config appsettings list --name func-dating-planner --resource-group rg-dating-planner | grep COMMUNICATION

# Test email sending manually
# Use Azure Portal Communication Services → Try Email
```

#### Issue: Email delivery delays or failures
**Symptoms:**
- Emails sent but not received
- Delivery delays
- Bounce notifications

**Solutions:**
```bash
# Check email quotas and limits
# Communication Services free tier: 250 emails/month

# Verify sender domain configuration
# Check SPF, DKIM records if using custom domain

# Monitor email delivery status in Azure Portal
# Go to Communication Services → Email → Delivery reports
```

#### Issue: Email formatting problems
**Symptoms:**
- Emails received but poorly formatted
- Missing content
- HTML rendering issues

**Solutions:**
```javascript
// Check email template in api/src/services/emailService.ts
// Verify HTML structure and content

// Test email template locally
const emailService = require('./src/services/emailService');
console.log(emailService.generateEmailContent(testData));

// Validate HTML with online validators
```

## 🔍 Monitoring and Logging

### Application Insights Issues

#### Issue: No telemetry data in Application Insights
**Symptoms:**
- Empty dashboards
- No function execution logs
- Missing performance data

**Solutions:**
```bash
# Verify Application Insights configuration
az monitor app-insights component show --app func-dating-planner --resource-group rg-dating-planner

# Check instrumentation key in Function App
az functionapp config appsettings list --name func-dating-planner --resource-group rg-dating-planner | grep INSIGHTS

# Test telemetry manually
# Add console.log statements to functions
# Check Function App logs in Azure Portal
```

#### Issue: Function execution errors not logged
**Symptoms:**
- Functions failing silently
- No error details in logs
- Missing stack traces

**Solutions:**
```javascript
// Add comprehensive error logging to functions
const { logger } = require('../utils/logger');

try {
  // Function logic
} catch (error) {
  logger.error('Function execution failed', { error: error.message, stack: error.stack });
  throw error;
}

// Check log levels in Application Insights
// Go to Application Insights → Logs → traces
```

## 🛠️ Recovery Procedures

### Infrastructure Recovery

#### Complete Infrastructure Rebuild
```bash
# Destroy existing infrastructure
cd terraform
terraform destroy -auto-approve

# Clean Terraform state
rm -f terraform.tfstate*

# Redeploy infrastructure
cd ..
./scripts/deploy-infrastructure.sh
```

#### Partial Resource Recovery
```bash
# Target specific resource for recreation
cd terraform
terraform taint azurerm_function_app.api
terraform apply

# Or import existing resource
terraform import azurerm_function_app.api /subscriptions/.../resourceGroups/.../providers/Microsoft.Web/sites/func-dating-planner
```

### Application Recovery

#### Redeploy Applications
```bash
# Redeploy via pipeline
# Trigger Azure DevOps pipeline manually

# Or deploy manually
npm run build
# Deploy to Static Web Apps using deployment token

cd api
npm run build
# Deploy to Function App using Azure CLI
az functionapp deployment source config-zip --name func-dating-planner --resource-group rg-dating-planner --src dist.zip
```

#### Reset Configuration
```bash
# Reset Function App settings
az functionapp config appsettings delete --name func-dating-planner --resource-group rg-dating-planner --setting-names SETTING_NAME

# Reapply settings from Terraform
cd terraform
terraform apply -target=azurerm_linux_function_app.api
```

## 📞 Getting Additional Help

### Diagnostic Information to Collect

When seeking help, collect the following information:

```bash
# System information
./scripts/setup-environment.sh > diagnostic-info.txt

# Azure resource status
az resource list --resource-group rg-dating-planner --output table >> diagnostic-info.txt

# Function App logs
az functionapp log tail --name func-dating-planner --resource-group rg-dating-planner >> diagnostic-info.txt

# Pipeline logs (from Azure DevOps)
# Export pipeline run logs

# Application Insights queries
# Export relevant telemetry data
```

### Support Resources

- **Azure Documentation:** https://docs.microsoft.com/azure/
- **Azure Functions Troubleshooting:** https://docs.microsoft.com/azure/azure-functions/functions-diagnostics
- **Static Web Apps Troubleshooting:** https://docs.microsoft.com/azure/static-web-apps/troubleshooting
- **Communication Services Documentation:** https://docs.microsoft.com/azure/communication-services/
- **Terraform Azure Provider:** https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs

### Emergency Contacts

For production issues:
1. Check Azure Service Health: https://status.azure.com/
2. Review Application Insights alerts
3. Check Azure DevOps service status
4. Contact Azure Support if needed

## 📋 Preventive Measures

### Regular Maintenance

```bash
# Weekly checks
./scripts/setup-environment.sh
az account show
terraform plan -detailed-exitcode

# Monthly reviews
# Review Azure costs
# Update dependencies
# Rotate secrets
# Review security settings
```

### Monitoring Setup

```bash
# Set up Azure Monitor alerts
az monitor metrics alert create --name "Function-Errors" \
  --resource-group rg-dating-planner \
  --scopes /subscriptions/.../resourceGroups/rg-dating-planner/providers/Microsoft.Web/sites/func-dating-planner \
  --condition "count exceptions > 5" \
  --description "Function app error rate too high"

# Set up cost alerts
az consumption budget create --budget-name "dating-planner-budget" \
  --amount 10 \
  --time-grain Monthly \
  --start-date $(date +%Y-%m-01) \
  --resource-group rg-dating-planner
```

This troubleshooting guide should help resolve most common issues. Keep it updated as new issues are discovered and resolved.