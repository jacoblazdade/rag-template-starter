#!/bin/bash

# Deploy landing page to Azure Static Web Apps
# Usage: ./deploy-landing.sh

set -e

echo "🚀 Deploying landing page to Azure Static Web Apps..."

# Get deployment token from Terraform
DEPLOYMENT_TOKEN=$(cd ../terraform && terraform output -raw static_web_app_deployment_token)
STATIC_URL=$(cd ../terraform && terraform output -raw landing_page_url)

if [ -z "$DEPLOYMENT_TOKEN" ]; then
  echo "❌ Error: Could not get deployment token from Terraform"
  echo "Make sure you've applied the Terraform configuration first:"
  echo "  cd terraform && terraform apply"
  exit 1
fi

echo "📦 Installing Azure Static Web Apps CLI..."
npm install -g @azure/static-web-apps-cli

echo "🔨 Building and deploying..."
cd ..
swa deploy landing \
  --deployment-token "$DEPLOYMENT_TOKEN" \
  --env production

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your landing page is live at:"
echo "   $STATIC_URL"
echo ""
echo "📊 View analytics in Azure Portal:"
echo "   https://portal.azure.com → Static Web Apps → ${STATIC_URL}"
