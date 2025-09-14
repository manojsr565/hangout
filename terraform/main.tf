# Configure the Azure Provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
  }
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {}
}

# Create a resource group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "dating-planner"
  }
}

# Create Static Web App
resource "azurerm_static_site" "app" {
  name                = var.static_web_app_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = {
    Environment = var.environment
    Project     = "dating-planner"
  }
}

resource "azurerm_log_analytics_workspace" "log" {
  name                = "hangoutapp-log"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Create Application Insights
resource "azurerm_application_insights" "monitoring" {
  name                = var.app_insights_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.log.id
  application_type    = "web"

  tags = {
    Environment = var.environment
    Project     = "dating-planner"
  }
}

# Create Service Plan for Function App
resource "azurerm_service_plan" "function_plan" {
  name                = var.function_app_service_plan_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "Y1"

  tags = {
    Environment = var.environment
    Project     = "dating-planner"
  }
}

# Create Storage Account for Function App
resource "azurerm_storage_account" "function_storage" {
  name                     = var.function_storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    Environment = var.environment
    Project     = "dating-planner"
  }
}

# Create Function App
resource "azurerm_linux_function_app" "api" {
  name                = var.function_app_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  storage_account_name       = azurerm_storage_account.function_storage.name
  storage_account_access_key = azurerm_storage_account.function_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.function_plan.id

  site_config {
    application_stack {
      node_version = "20"
    }
    cors {
      allowed_origins     = ["*"]
      support_credentials = false
    }
    ftps_state              = "Disabled"
    http2_enabled           = true
    minimum_tls_version     = "1.2"
    scm_minimum_tls_version = "1.2"
    use_32_bit_worker       = false

    # Security headers
    app_service_logs {
      disk_quota_mb         = 35
      retention_period_days = 7
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"                 = "node"
    "WEBSITE_NODE_DEFAULT_VERSION"             = "~20"
    "APPINSIGHTS_INSTRUMENTATIONKEY"           = azurerm_application_insights.monitoring.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"    = azurerm_application_insights.monitoring.connection_string
    "COMMUNICATION_SERVICES_CONNECTION_STRING" = azurerm_communication_service.email.primary_connection_string
    "EMAIL_FROM_ADDRESS"                       = "DoNotReply@${azurerm_email_communication_service_domain.email_domain.mail_from_sender_domain}"
    "EMAIL_TO_ADDRESS"                         = var.notification_email
    "WEBSITE_RUN_FROM_PACKAGE"                 = "1"
    "WEBSITE_ENABLE_SYNC_UPDATE_SITE"          = "true"
  }

  tags = {
    Environment = var.environment
    Project     = "dating-planner"
  }
}

# Create Communication Services
resource "azurerm_communication_service" "email" {
  name                = var.communication_service_name
  resource_group_name = azurerm_resource_group.main.name
  data_location       = "United States"

  tags = {
    Environment = var.environment
    Project     = "dating-planner"
  }
}

# Create Email Communication Service
resource "azurerm_email_communication_service" "email_service" {
  name                = "${var.communication_service_name}-email"
  resource_group_name = azurerm_resource_group.main.name
  data_location       = "United States"

  tags = {
    Environment = var.environment
    Project     = "dating-planner"
  }
}

# Create Email Communication Service Domain (Azure Managed)
resource "azurerm_email_communication_service_domain" "email_domain" {
  name             = "AzureManagedDomain"
  email_service_id = azurerm_email_communication_service.email_service.id

  domain_management = "AzureManaged"

  tags = {
    Environment = var.environment
    Project     = "dating-planner"
  }
}
