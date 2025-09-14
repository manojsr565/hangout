# Variables for Azure resources
variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-dating-planner"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "static_web_app_name" {
  description = "Name of the Static Web App"
  type        = string
  default     = "swa-dating-planner"
}

variable "function_app_name" {
  description = "Name of the Function App"
  type        = string
  default     = "func-dating-planner"
}

variable "function_app_service_plan_name" {
  description = "Name of the Function App Service Plan"
  type        = string
  default     = "asp-dating-planner"
}

variable "function_storage_account_name" {
  description = "Name of the storage account for Function App"
  type        = string
  default     = "stdatingplanner"
}

variable "communication_service_name" {
  description = "Name of the Communication Service"
  type        = string
  default     = "cs-dating-planner"
}

variable "app_insights_name" {
  description = "Name of Application Insights"
  type        = string
  default     = "ai-dating-planner"
}

variable "notification_email" {
  description = "Email address to receive notifications"
  type        = string
  default     = "your-email@example.com"
}