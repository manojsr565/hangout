# Dating Planner App

A React-based dating planner application with Azure cloud hosting and email notifications. Users can create personalized date plans and receive email notifications when plans are submitted.

## 🚀 Quick Start

### Local Development

**Prerequisites:** Node.js 18+, Azure CLI (for deployment)

1. **Clone and install dependencies:**
   ```bash
   npm install
   cd api && npm install && cd ..
   ```

2. **Configure local environment:**
   ```bash
   cp api/local.settings.example.json api/local.settings.json
   # Edit api/local.settings.json with your Azure Communication Services settings
   ```

3. **Run the application:**
   ```bash
   # Start frontend (React app)
   npm run dev
   
   # Start backend (Azure Functions) - in separate terminal
   cd api && npm start
   ```

4. **Validate setup:**
   ```bash
   ./scripts/setup-environment.sh
   ```

### Azure Deployment

**Prerequisites:** Azure subscription, Azure CLI, Terraform

1. **Deploy infrastructure:**
   ```bash
   ./scripts/deploy-infrastructure.sh
   ```

2. **Configure Azure DevOps pipelines** (see [Pipeline Setup Guide](PIPELINE_SETUP.md))

3. **Deploy applications via pipeline or manually**

## 📋 Architecture Overview

- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** Azure Functions (Node.js/TypeScript)
- **Hosting:** Azure Static Web Apps (Free tier)
- **Email:** Azure Communication Services
- **Infrastructure:** Terraform
- **CI/CD:** Azure DevOps Pipelines

## 🛠️ Setup and Deployment

### 1. Infrastructure Setup

The application uses Terraform to provision Azure resources:

```bash
# Configure Terraform variables
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform/terraform.tfvars with your settings

# Deploy infrastructure
./scripts/deploy-infrastructure.sh
```

**Resources created:**
- Resource Group
- Static Web App (Free tier)
- Function App (Consumption plan)
- Communication Services (Email)
- Application Insights (Monitoring)
- Storage Account (Function App requirement)

### 2. Application Configuration

#### Local Development
1. Copy `api/local.settings.example.json` to `api/local.settings.json`
2. Configure Azure Communication Services connection string
3. Set notification email address
4. Run validation: `./scripts/setup-environment.sh`

#### Production Configuration
- Configure Azure DevOps service connections
- Set up pipeline variables (see [Environment Config](ENVIRONMENT_CONFIG.md))
- Get Static Web Apps deployment token from Azure Portal

### 3. CI/CD Pipeline Setup

Choose one of the pipeline configurations:

- **Complete Pipeline:** `azure-pipelines-complete.yml` (infrastructure + applications)
- **Separate Pipelines:** `azure-pipelines-infrastructure.yml` + `azure-pipelines.yml`

See [Pipeline Setup Guide](PIPELINE_SETUP.md) for detailed instructions.

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Pipeline Setup](PIPELINE_SETUP.md) | Azure DevOps pipeline configuration |
| [Environment Config](ENVIRONMENT_CONFIG.md) | Environment variables and secrets |
| [Azure DevOps Setup](azure-devops-setup.md) | Service connections and variables |
| [Terraform README](terraform/README.md) | Infrastructure configuration |
| [API Documentation](api/README.md) | Backend API details |

## 🔧 Development

### Project Structure
```
├── components/          # React components
├── api/                # Azure Functions backend
│   ├── src/functions/  # Function implementations
│   ├── src/services/   # Business logic
│   └── src/utils/      # Utilities and logging
├── terraform/          # Infrastructure as code
├── scripts/           # Deployment and setup scripts
└── .kiro/specs/       # Feature specifications
```

### Available Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

#### Backend (in api/ directory)
- `npm start` - Start Azure Functions locally
- `npm run build` - Build TypeScript
- `npm test` - Run tests

#### Infrastructure
- `./scripts/deploy-infrastructure.sh` - Deploy Azure infrastructure
- `./scripts/setup-environment.sh` - Validate environment setup

### Testing

```bash
# Frontend tests
npm test

# Backend tests
cd api && npm test

# Integration tests
npm run test:integration
```

## 🔐 Security and Configuration

### Environment Variables

**Required for Function App:**
- `COMMUNICATION_SERVICES_CONNECTION_STRING` - Azure Communication Services
- `EMAIL_TO_ADDRESS` - Notification recipient email
- `EMAIL_FROM_ADDRESS` - Sender email (auto-configured)

**Azure DevOps Variables:**
- `AZURE_SERVICE_CONNECTION` - Service connection name
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Deployment token
- `NOTIFICATION_EMAIL` - Email for notifications

### Security Best Practices
- Store secrets in Azure DevOps variable groups
- Use managed identities where possible
- Enable Application Insights monitoring
- Regular security reviews and updates

## 💰 Cost Optimization

The application is designed for minimal cost using Azure free tiers:

- **Static Web Apps:** 100GB bandwidth/month free
- **Azure Functions:** 1M requests/month free
- **Communication Services:** 250 emails/month free
- **Application Insights:** 5GB data/month free

Estimated monthly cost: $0-5 for personal use (1-2 users)

## 🐛 Troubleshooting

### Common Issues

**Local Development:**
- Function app not starting → Check `local.settings.json` configuration
- Email not sending → Verify Communication Services connection string

**Deployment:**
- Service connection failures → Check Azure permissions
- Static Web Apps token issues → Regenerate in Azure Portal
- Build failures → Verify Node.js versions and dependencies

**Runtime:**
- Email delivery failures → Check Communication Services quotas
- Function timeouts → Review Application Insights logs

### Getting Help

1. Check the troubleshooting guides in documentation
2. Review Application Insights logs in Azure Portal
3. Validate configuration with `./scripts/setup-environment.sh`
4. Check Azure DevOps pipeline logs for deployment issues

## 📝 Contributing

1. Create feature branch from `main`
2. Make changes and test locally
3. Run validation: `./scripts/setup-environment.sh`
4. Create pull request to `main`
5. Pipeline will validate and deploy on merge

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
