# Azure Static Web App for Landing Page

resource "azurerm_static_site" "landing" {
  name                = "${var.prefix}-${var.environment}-landing"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = {
    Environment = var.environment
    Project     = "RAG Template"
    ManagedBy   = "Terraform"
  }
}

# Output the deployment token (sensitive)
output "static_web_app_deployment_token" {
  value     = azurerm_static_site.landing.api_key
  sensitive = true
}

# Output the default hostname
output "static_web_app_default_hostname" {
  value = azurerm_static_site.landing.default_host_name
}

# Output the URL
output "landing_page_url" {
  value = "https://${azurerm_static_site.landing.default_host_name}"
}
