terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }

  # Uncomment to use Azure Blob Storage for Terraform state
  # backend "azurerm" {
  #   resource_group_name  = "terraform-state-rg"
  #   storage_account_name = "terraformstate"
  #   container_name       = "tfstate"
  #   key                  = "rag-template.tfstate"
  # }
}

provider "azurerm" {
  features {}
}

# Register required Azure resource providers
resource "null_resource" "register_providers" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = "az provider register --namespace Microsoft.App"
  }
}

# Variables
variable "prefix" {
  description = "Prefix for all resources"
  type        = string
  default     = "rag"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "swedencentral" # EU data residency for GDPR
}

variable "openai_model" {
  description = "OpenAI model to deploy"
  type        = string
  default     = "gpt-4o"
}

variable "openai_model_version" {
  description = "Model version (check Azure OpenAI Studio for available versions)"
  type        = string
  default     = "2024-08-06"
}

variable "monthly_budget_amount" {
  description = "Monthly budget amount in USD"
  type        = number
  default     = 100
}

variable "budget_alert_email" {
  description = "Email for budget alerts"
  type        = string
  default     = ""
}

# Random suffix for unique names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.prefix}-${var.environment}-rg"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "RAG Template"
    ManagedBy   = "Terraform"
  }
}

# Azure OpenAI Service
resource "azurerm_cognitive_account" "openai" {
  name                = "${var.prefix}-${var.environment}-openai"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "OpenAI"
  sku_name            = "S0"

  tags = {
    Environment = var.environment
    Project     = "RAG Template"
  }
}

resource "azurerm_cognitive_deployment" "gpt" {
  name                 = var.openai_model
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = var.openai_model
    version = var.openai_model_version
  }

  scale {
    type     = "Standard"
    capacity = 10
  }
}

resource "azurerm_cognitive_deployment" "embedding" {
  name                 = "text-embedding-3-large"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = "text-embedding-3-large"
    version = "1"
  }

  scale {
    type     = "Standard"
    capacity = 10
  }
}

# Azure AI Search
resource "azurerm_search_service" "main" {
  name                = "${var.prefix}${var.environment}search"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  sku                 = "standard"

  tags = {
    Environment = var.environment
    Project     = "RAG Template"
  }
}

# Azure Blob Storage
resource "azurerm_storage_account" "main" {
  name                     = "${var.prefix}${var.environment}storage"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    Environment = var.environment
    Project     = "RAG Template"
  }
}

resource "azurerm_storage_container" "documents" {
  name                  = "documents"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = "${var.prefix}${var.environment}acr${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  sku                 = "Standard"
  admin_enabled       = true

  tags = {
    Environment = var.environment
    Project     = "RAG Template"
  }
}

# Azure Container Apps Environment
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.prefix}-${var.environment}-logs"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_container_app_environment" "main" {
  name                       = "${var.prefix}-${var.environment}-env"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  # Prevent workspace_id from causing replacement after initial creation
  lifecycle {
    ignore_changes = [
      log_analytics_workspace_id,
    ]
  }
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "${var.prefix}-${var.environment}-insights"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "Node.JS"

  # Keep Application Insights bound to the Log Analytics workspace.
  # Once a workspace_id is set, Azure does not allow removing it, only replacing
  # the entire Application Insights resource. Re-adding it here prevents Terraform
  # from attempting an unsupported removal on existing deployments.
  workspace_id = azurerm_log_analytics_workspace.main.id

  # Prevent accidental changes to workspace_id from forcing replacement
  lifecycle {
    ignore_changes = [
      workspace_id,
    ]
  }

  tags = {
    Environment = var.environment
    Project     = "RAG Template"
  }
}

# Budget Alerts
resource "azurerm_monitor_action_group" "budget_alerts" {
  count               = var.budget_alert_email != "" ? 1 : 0
  name                = "${var.prefix}-${var.environment}-budget-alerts"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "BudgetAlert"

  email_receiver {
    name          = "BudgetAlertEmail"
    email_address = var.budget_alert_email
  }
}

resource "azurerm_consumption_budget_subscription" "main" {
  count             = var.budget_alert_email != "" ? 1 : 0
  name              = "${var.prefix}-${var.environment}-budget"
  subscription_id   = data.azurerm_subscription.current.id
  amount            = var.monthly_budget_amount
  time_grain        = "Monthly"

  time_period {
    start_date = formatdate("YYYY-MM-01'T'00:00:00Z", timestamp())
  }

  notification {
    enabled        = true
    threshold      = 80
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = [var.budget_alert_email]
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = [var.budget_alert_email]
  }

  notification {
    enabled        = true
    threshold      = 80
    operator       = "GreaterThan"
    threshold_type = "Forecasted"
    contact_emails = [var.budget_alert_email]
    contact_groups = [azurerm_monitor_action_group.budget_alerts[0].id]
  }
}

# Data source for current subscription
data "azurerm_subscription" "current" {}

# Outputs
output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "openai_endpoint" {
  value     = azurerm_cognitive_account.openai.endpoint
  sensitive = false
}

output "openai_key" {
  value     = azurerm_cognitive_account.openai.primary_access_key
  sensitive = true
}

output "search_endpoint" {
  value     = "https://${azurerm_search_service.main.name}.search.windows.net"
  sensitive = false
}

output "search_key" {
  value     = azurerm_search_service.main.primary_key
  sensitive = true
}

output "storage_connection_string" {
  value     = azurerm_storage_account.main.primary_connection_string
  sensitive = true
}

output "application_insights_connection_string" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}

output "acr_login_server" {
  value = azurerm_container_registry.main.login_server
}
