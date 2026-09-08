# BuildPath Backend CI/CD & Operations Guide

## Overview

The BuildPath backend repository (`Project-web-backend`) uses an automated GitHub Actions CI/CD pipeline targeting **Azure Container Apps** and **Azure Container Registry (ACR)**.

### Pipeline Flow

```
Git Push to main
       ↓
GitHub Actions
       ↓
Run validation & tests (npm ci, lint, test)
       ↓
Authenticate with Azure via OIDC (No stored client secrets)
       ↓
Build Docker image tagged with Git SHA (and latest)
       ↓
Push image to ca7fdbb90831acr.azurecr.io
       ↓
Deploy image to buildpath-backend in buildpath-rg (preserving all runtime env vars & secrets)
       ↓
Verify production endpoint (/health) with retries
       ↓
Production updated
```

---

## 1. Azure OIDC Setup (One-time Setup)

The workflow authenticates using GitHub Actions OpenID Connect (OIDC) federated credentials without storing long-lived passwords or client secrets.

### GitHub Secrets Required

In your GitHub repository settings (**Settings → Secrets and variables → Actions → New repository secret**), configure:

| Secret Name | Description | Example / Value |
|-------------|-------------|-----------------|
| `AZURE_CLIENT_ID` | Application (Client) ID of the Microsoft Entra App Registration | `<app-id-guid>` |
| `AZURE_TENANT_ID` | Directory (Tenant) ID of your Azure account | `b7503ed1-1602-4a44-9665-3e560a3516d1` |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID | `47752be6-a9c4-43f4-9a57-d5471be400c8` |

### Step-by-Step Azure CLI Setup Commands

Run these commands using the Azure CLI logged into your subscription:

```bash
# 1. Variables
APP_NAME="github-actions-buildpath-backend"
REPO="loqom/Project-web-backend"
SUBSCRIPTION_ID="47752be6-a9c4-43f4-9a57-d5471be400c8"
RESOURCE_GROUP="buildpath-rg"
ACR_NAME="ca7fdbb90831acr"
CONTAINER_APP="buildpath-backend"

# 2. Create the Microsoft Entra App Registration
APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
az ad sp create --id "$APP_ID"

# 3. Create Federated Credential for the 'main' branch
az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters "{\"name\":\"github-main-branch\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:${REPO}:ref:refs/heads/main\",\"audiences\":[\"api://AzureADTokenExchange\"]}"

# 4. Grant AcrPush role on the Azure Container Registry
ACR_ID=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
az role assignment create \
  --assignee "$APP_ID" \
  --role "AcrPush" \
  --scope "$ACR_ID"

# 5. Grant Contributor role on the Container App resource
CONTAINER_APP_ID=$(az containerapp show --name "$CONTAINER_APP" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
az role assignment create \
  --assignee "$APP_ID" \
  --role "Contributor" \
  --scope "$CONTAINER_APP_ID"

# 6. Print values for GitHub Secrets
echo "AZURE_CLIENT_ID: $APP_ID"
echo "AZURE_TENANT_ID: $(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
```

---

## 2. Preserving Existing Configuration

The deployment step executes:

```bash
az containerapp update \
  --name buildpath-backend \
  --resource-group buildpath-rg \
  --image ca7fdbb90831acr.azurecr.io/buildpath-backend:<git-sha>
```

This updates **strictly the container image**. All existing Azure Container App configuration remains 100% intact:
- MongoDB URI (`mongo-uri`)
- JWT secret (`jwt-secret`)
- Google client secret (`google-client-id`)
- Resend API key (`resend-api-key`)
- Internal API key (`internal-api-key`)
- Python service URL (`https://buildpath-python.salmonwater-32d8ff10.eastasia.azurecontainerapps.io`)
- Frontend CORS URL (`https://getbuildpath.tech`)
- Ingress target port (`3001`) and external ingress settings
- CPU / Memory (0.25 CPU / 0.5Gi RAM)

---

## 3. Rollback Procedure

Because every release image is tagged with an immutable Git commit SHA:

### Finding Deployed Images
To inspect all past image tags stored in the registry:
```bash
az acr repository show-tags --name ca7fdbb90831acr --repository buildpath-backend --output table
```

To see the currently running image on the container app:
```bash
az containerapp show --name buildpath-backend --resource-group buildpath-rg --query "template.containers[0].image" -o tsv
```

### Executing a Manual Rollback
To immediately revert production to any prior known-good Git commit SHA or version tag:
```bash
az containerapp update \
  --name buildpath-backend \
  --resource-group buildpath-rg \
  --image ca7fdbb90831acr.azurecr.io/buildpath-backend:<previous-git-sha-or-tag>
```

---

## 4. Normal Developer Workflow

After the secrets are added, backend deployments require only standard git commands:

```bash
git add .
git commit -m "feat: your feature"
git push origin main
```

GitHub Actions will automatically run tests, build the container image, tag it with the commit SHA, push it to ACR, update the Azure Container App, and verify health check at `/health`.
