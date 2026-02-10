# Terraform Infrastructure

This directory contains Terraform configuration for deploying the RAG Template Starter infrastructure on Azure.

## Resources Created

- **Resource Group**: All resources organized under one group
- **Azure OpenAI**: GPT-4o and text-embedding-3-large models
- **Azure AI Search**: Vector search index
- **Azure Blob Storage**: Document storage
- **Azure Document Intelligence**: OCR for PDFs
- **Azure Container Registry**: Docker image registry
- **Azure Container Apps Environment**: Serverless container hosting
- **Azure Static Web Apps**: Landing page hosting
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

## Landing Page Deployment

The landing page is hosted on Azure Static Web Apps (Free tier):

```bash
# Deploy landing page
cd landing
./deploy-azure.sh
```

Or manually:

```bash
# Get deployment token
DEPLOYMENT_TOKEN=$(cd terraform && terraform output -raw static_web_app_deployment_token)

# Deploy using SWA CLI
npm install -g @azure/static-web-apps-cli
swa deploy landing --deployment-token "$DEPLOYMENT_TOKEN"
```

Your landing page will be available at the URL output by Terraform.

## Security Notes

- All secrets are marked as `sensitive` in outputs
- Use Azure Key Vault for production secrets management
- Enable soft-delete for Blob Storage
- Use managed identities instead of admin keys where possible
- Enable diagnostic logging for all resources
