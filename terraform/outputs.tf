# Output values for important resources
output "resource_group_name" {
  description = "Name of the created resource group"
  value       = azurerm_resource_group.main.name
}

output "static_web_app_url" {
  description = "URL of the Static Web App"
  value       = azurerm_static_site.app.default_host_name
}

output "static_web_app_api_key" {
  description = "API key for Static Web App deployment"
  value       = azurerm_static_site.app.api_key
  sensitive   = true
}

output "function_app_name" {
  description = "Name of the Function App"
  value       = azurerm_linux_function_app.api.name
}

output "function_app_url" {
  description = "URL of the Function App"
  value       = azurerm_linux_function_app.api.default_hostname
}

output "communication_service_connection_string" {
  description = "Connection string for Communication Services"
  value       = azurerm_communication_service.email.primary_connection_string
  sensitive   = true
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.monitoring.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.monitoring.connection_string
  sensitive   = true
}

output "email_service_name" {
  description = "Name of the Email Communication Service"
  value       = azurerm_email_communication_service.email_service.name
}

output "email_domain" {
  description = "Email domain for sending notifications"
  value       = azurerm_email_communication_service_domain.email_domain.mail_from_sender_domain
}