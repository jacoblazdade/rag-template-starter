# Terraform Infrastructure

This directory contains Terraform configuration for deploying the RAG Template Starter infrastructure on Azure.

## Resources Created

- **Resource Group**: All resources organized under one group
- **Azure OpenAI**: GPT-5.1 and text-embedding-3-large models
- **Azure AI Search**: Vector search index
- **Azure Blob Storage**: Document storage
- **Azure Container Registry**: Docker image registry
- **Azure Container Apps Environment**: Serverless container hosting
- **Application Insights**: Monitoring and observability
- **Log Analytics**: Log aggregation

## Prerequisites

- Azure CLI installed and logged in
- Terraform CLI installed (>= 1.5.0)
- Azure subscription with Owner or Contributor access

## Usage

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "your-subscription-id"

# Initialize Terraform
cd terraform
terraform init

# Plan changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan

# Destroy (careful!)
terraform destroy
```

## Configuration

Edit variables in `main.tf` or create a `terraform.tfvars` file:

```hcl
prefix      = "myproject"
environment = "prod"
location    = "swedencentral"
openai_model = "gpt-5.1"
```

## State Management

For production, use Azure Blob Storage for Terraform state:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "terraformstate"
    container_name       = "tfstate"
    key                  = "rag-template.tfstate"
  }
}
```

## Security Notes

- All secrets are marked as `sensitive` in outputs
- Use Azure Key Vault for production secrets management
- Enable soft-delete for Blob Storage
- Use managed identities instead of admin keys where possible
- Enable diagnostic logging for all resources
