# Deployment Guide

This guide walks you through deploying the RAG Template Starter to Azure.

## Prerequisites

- Azure subscription with Owner or Contributor access
- Azure CLI installed: `brew install azure-cli`
- Terraform installed: `brew install terraform`
- Node.js 20+ and pnpm
- Git

## Step 1: Azure Login

```bash
# Login to Azure
az login

# Set your subscription
az account list --output table
az account set --subscription "your-subscription-id"

# Verify
az account show
```

## Step 2: Create Terraform State Storage (Recommended)

For production, store Terraform state remotely:

```bash
# Create resource group for Terraform state
az group create --name terraform-state-rg --location swedencentral

# Create storage account
az storage account create \
  --name terraformstate$(openssl rand -hex 4) \
  --resource-group terraform-state-rg \
  --location swedencentral \
  --sku Standard_LRS

# Create blob container
az storage container create \
  --name tfstate \
  --account-name <storage-account-name>

# Get access key
az storage account keys list \
  --resource-group terraform-state-rg \
  --account-name <storage-account-name>
```

Update `terraform/main.tf` backend configuration:
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "terraformstate..."
    container_name       = "tfstate"
    key                  = "rag-template.tfstate"
  }
}
```

## Step 3: Deploy Azure Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Review the plan carefully, then apply
terraform apply tfplan
```

This creates:
- Resource Group
- Azure OpenAI (GPT-5.1 + text-embedding-3-large)
- Azure AI Search
- Azure Blob Storage
- Azure Container Registry
- Azure Container Apps Environment
- Application Insights

**⏱️ Deployment time:** ~10-15 minutes

## Step 4: Get Credentials

After Terraform completes, get the outputs:

```bash
# View all outputs
terraform output

# Get specific values
terraform output openai_endpoint
terraform output -raw openai_key
terraform output -raw storage_connection_string
```

## Step 5: Configure Environment

Create `.env` file in project root:

```bash
cp .env.example .env
```

Fill in the values from Terraform outputs:

```env
NODE_ENV=production
PORT=3000

# From terraform output
AZURE_OPENAI_ENDPOINT=<openai_endpoint>
AZURE_OPENAI_API_KEY=<openai_key>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.1

AZURE_SEARCH_ENDPOINT=<search_endpoint>
AZURE_SEARCH_API_KEY=<search_key>
AZURE_SEARCH_INDEX_NAME=documents

AZURE_STORAGE_CONNECTION_STRING=<storage_connection_string>
AZURE_STORAGE_CONTAINER_NAME=documents

# Optional OCR
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=<endpoint>
AZURE_DOCUMENT_INTELLIGENCE_KEY=<key>

# Redis (use Azure Redis or containerized)
REDIS_URL=redis://localhost:6379

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=<app_insights_connection_string>
```

## Step 6: Create Search Index

```bash
# Run locally to create the index
pnpm install
pnpm dev

# In another terminal, create the index
curl -X POST http://localhost:3000/api/v1/admin/create-index
```

Or add this to your startup script:

```typescript
// src/index.ts
import { AzureSearchService } from './services/azureSearch.js';

const searchService = new AzureSearchService();
await searchService.createIndex();
```

## Step 7: Build Docker Image

```bash
# Build image
docker build -t rag-template:latest .

# Test locally
docker run -p 3000:3000 --env-file .env rag-template:latest
```

## Step 8: Push to Azure Container Registry

```bash
# Get ACR login server
ACR_NAME=$(terraform output -raw acr_name)
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"

# Login to ACR
az acr login --name $ACR_NAME

# Tag image
docker tag rag-template:latest ${ACR_LOGIN_SERVER}/rag-template:latest

# Push
docker push ${ACR_LOGIN_SERVER}/rag-template:latest
```

## Step 9: Deploy to Azure Container Apps

```bash
# Get Container Apps environment
ENV_NAME=$(terraform output -raw container_app_env_name)
RG_NAME=$(terraform output -raw resource_group_name)

# Create Container App
az containerapp create \
  --name rag-template-api \
  --resource-group $RG_NAME \
  --environment $ENV_NAME \
  --image ${ACR_LOGIN_SERVER}/rag-template:latest \
  --target-port 3000 \
  --ingress external \
  --registry-server ${ACR_LOGIN_SERVER} \
  --env-vars \
    NODE_ENV=production \
    AZURE_OPENAI_ENDPOINT="$(terraform output -raw openai_endpoint)" \
    AZURE_OPENAI_API_KEY="$(terraform output -raw openai_key)" \
    AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.1 \
    AZURE_SEARCH_ENDPOINT="$(terraform output -raw search_endpoint)" \
    AZURE_SEARCH_API_KEY="$(terraform output -raw search_key)" \
    AZURE_SEARCH_INDEX_NAME=documents \
    AZURE_STORAGE_CONNECTION_STRING="$(terraform output -raw storage_connection_string)" \
    AZURE_STORAGE_CONTAINER_NAME=documents
```

## Step 10: Verify Deployment

```bash
# Get the Container App URL
APP_URL=$(az containerapp show \
  --name rag-template-api \
  --resource-group $RG_NAME \
  --query properties.configuration.ingress.fqdn \
  -o tsv)

# Test health endpoint
curl https://${APP_URL}/api/v1/health
```

## Step 11: Setup CI/CD (Optional)

The project includes a GitHub Actions workflow. To enable it:

1. Add Azure credentials as GitHub secrets:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "rag-template-github" \
  --role contributor \
  --scopes /subscriptions/<subscription-id> \
  --sdk-auth
```

2. Add these secrets to GitHub:
   - `AZURE_CREDENTIALS` (output from above)
   - `ACR_LOGIN_SERVER`
   - `ACR_USERNAME`
   - `ACR_PASSWORD`

3. Push to main branch to trigger deployment

## Cost Estimation

### Monthly costs (approximate):

| Service | Tier | Cost |
|---------|------|------|
| Azure OpenAI | Standard | €50-200 (usage-based) |
| Azure AI Search | Standard | €70 |
| Blob Storage | Standard LRS | €5-20 |
| Container Apps | Consumption | €0-50 |
| Application Insights | Pay-as-you-go | €0-20 |
| **Total** | | **€125-360/month** |

**Free tier options:**
- Use Azure free credits ($200 for 30 days)
- Container Apps has free quota (2M requests/month)

## Scaling

### Horizontal Scaling
```bash
az containerapp update \
  --name rag-template-api \
  --resource-group $RG_NAME \
  --min-replicas 2 \
  --max-replicas 10
```

### Vertical Scaling
```bash
az containerapp update \
  --name rag-template-api \
  --resource-group $RG_NAME \
  --cpu 2.0 \
  --memory 4.0Gi
```

## Monitoring

View logs:
```bash
az containerapp logs show \
  --name rag-template-api \
  --resource-group $RG_NAME \
  --follow
```

View metrics in Azure Portal:
- Application Insights > Metrics
- Container Apps > Metrics

## Backup & Disaster Recovery

### Backup Blob Storage
```bash
az storage blob copy start-batch \
  --destination-container backups \
  --source-container documents
```

### Export Terraform State
```bash
terraform state pull > terraform.tfstate.backup
```

## Cleanup

To destroy all resources:

```bash
cd terraform
terraform destroy
```

**⚠️ Warning:** This deletes everything permanently!

## Troubleshooting

### Container App not starting
```bash
# Check logs
az containerapp logs show --name rag-template-api --resource-group $RG_NAME --tail 100

# Check events
az containerapp show --name rag-template-api --resource-group $RG_NAME --query properties.latestRevisionName
```

### OpenAI quota errors
- Check Azure OpenAI Studio > Quotas
- Request quota increase if needed
- Enable auto-scaling for deployments

### Search index errors
- Verify index exists: `az search index show`
- Recreate index if corrupted
- Check field mappings match code

## Security Hardening (Production)

1. **Enable Managed Identity**
```bash
az containerapp identity assign \
  --name rag-template-api \
  --resource-group $RG_NAME \
  --system-assigned
```

2. **Use Key Vault**
```bash
az keyvault create --name rag-kv --resource-group $RG_NAME
az keyvault secret set --vault-name rag-kv --name openai-key --value "<key>"
```

3. **Enable HTTPS only**
4. **Setup WAF with Azure Front Door**
5. **Enable Azure AD authentication**
6. **Configure CORS properly**

## Next Steps

- Setup custom domain
- Enable authentication
- Configure rate limiting
- Add monitoring alerts
- Setup backup jobs
- Document operational procedures
