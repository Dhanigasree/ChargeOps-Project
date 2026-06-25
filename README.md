Test 
# ChargeOps CI/CD and Kubernetes Runbook

This repository now includes a capstone-ready CI/CD setup for ChargeOps using Docker, GitHub Actions, and Kubernetes with separate `dev` and `prod` environments.

## Folder layout

- `ev-frontend/` contains the React UI and its hardened Docker image build.
- `ev-backend/services/` contains the API gateway and backend microservices.
- `scripts/prepare-microservice-repos.ps1` generates one repo per service to support a GitHub organization layout with separate repositories.
- `docs/repo-split-plan.md` documents the recommended repo split for GitHub.
- `k8s-manifests/base/` contains reusable Kubernetes deployments, services, MongoDB, probes, and network policies.
- `k8s-manifests/overlays/dev/` contains the `dev` namespace, config, and persistent storage binding.
- `k8s-manifests/overlays/prod/` contains the `prod` namespace, config, and persistent storage binding.
- `k8s/chargeops/` contains the Agentic AI service manifests for the `chargeops` namespace, including Deployment, Service, ConfigMap, Secret, HPA, NetworkPolicy, and IRSA service account.
- `.github/workflows/ci-cd.yml` contains the branch-based build, scan, push, and deploy workflow.
- `.github/workflows/codeql.yml` contains SAST scanning with GitHub CodeQL.

## Agentic AI service

ChargeOps now includes `ev-backend/services/ai-service`, a Node.js/Express microservice that exposes `POST /api/ai/chat` through the API gateway at `/api/ai/*`. It uses Amazon Bedrock Converse tool calling, MongoDB conversation memory in `chat_history`, structured JSON logs, and modular tools for station search, booking creation, payment spending history, review lookup, and admin utilization analytics.

Deploy it with:

```bash
kubectl apply -k k8s/chargeops
kubectl apply -f argocd/chargeops-ai-service-app.yaml
```

Required AWS setup:

- Create an ECR repository such as `chargeops/ai-service`.
- Create an IRSA role for the `chargeops/ai-service` service account with `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`, `secretsmanager:GetSecretValue`, and the required `kms:Decrypt` permission.
- Store the MongoDB URI in AWS Secrets Manager under the secret ID configured by `k8s/chargeops/secret.yaml`.
- Set GitHub secrets `AWS_ROLE_TO_ASSUME`, `ARGOCD_SERVER`, and `ARGOCD_AUTH_TOKEN`; optionally set repository variables `AWS_REGION` and `ECR_REPOSITORY`.

## Multi-Repo Export

If you want this project to appear on GitHub as separate repositories like a microservices organization page, generate split repositories with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-microservice-repos.ps1
```

This creates `split-output/` with one folder per service plus a dedicated infrastructure repo. See `docs/repo-split-plan.md` for the recommended repo names and push flow.

## Capstone Runbook

This project now includes:

- `k8s/dev/` for direct dev namespace deployment
- `k8s/prod/` for direct prod namespace deployment
- `.github/workflows/ci-cd.yml` for branch-based CI/CD with Docker Hub, Trivy, SonarQube, and Kubernetes deployment
- `docs/github-secrets-runbook.md` for GitHub Actions, Docker Hub, Kubernetes, and SonarQube secrets setup

Direct apply commands:

```bash
kubectl apply -f k8s/dev/
kubectl apply -f k8s/prod/
```

## Branch trigger logic

- Push to `develop` deploys to the `dev` GitHub Environment and the `dev` Kubernetes namespace.
- Push to `main` deploys to the `prod` GitHub Environment and the `prod` Kubernetes namespace.
- Both branches build the images once per commit using the commit SHA tag, scan them, and then deploy the exact same image tag that passed the gates.

## What the Kubernetes manifests do

- Deploy the `frontend`, `api-gateway`, `auth-service`, `user-service`, `station-service`, `booking-service`, `payment-service`, `review-service`, and `admin-service`.
- Deploy a persistent MongoDB instance in each namespace with a `PersistentVolume` and `PersistentVolumeClaim`.
- Use `ConfigMap` for non-secret configuration like `NODE_ENV`, `FRONTEND_APP_URL`, and `MONGO_HOST`.
- Use a runtime-created Kubernetes `Secret` named `chargeops-secrets` for database credentials and API secrets.
- Add `livenessProbe` and `readinessProbe` to the UI, API gateway, and backend services.
- Apply `NetworkPolicy` rules so service-to-service traffic is limited to intended paths.

## Required GitHub setup

Create two GitHub Environments:

- `dev`
- `prod`

Add these environment secrets to both environments:

- `KUBE_CONFIG`
- `MONGO_ROOT_USERNAME`
- `MONGO_ROOT_PASSWORD`
- `JWT_SECRET`
- `INTERNAL_SERVICE_API_KEY`
- `STRIPE_SECRET_KEY`

`KUBE_CONFIG` should be stored as base64-encoded kubeconfig content. Example:

```bash
base64 -w 0 ~/.kube/config
```

If your GHCR package visibility is private, either make the packages public after first push or extend the deployment with an image pull secret. For a capstone demo, public GHCR packages are the simplest option.

## Manual deployment commands

For local testing without GitHub Actions:

```bash
kubectl create namespace dev
kubectl -n dev create secret generic chargeops-secrets \
  --from-literal=MONGO_ROOT_USERNAME=admin \
  --from-literal=MONGO_ROOT_PASSWORD=<set-password> \
  --from-literal=JWT_SECRET=<set-jwt-secret> \
  --from-literal=INTERNAL_SERVICE_API_KEY=<set-internal-api-key> \
  --from-literal=STRIPE_SECRET_KEY=<set-stripe-secret>
kubectl apply -k k8s-manifests/overlays/dev
```

For prod, replace `dev` with `prod` and apply `k8s-manifests/overlays/prod`.

The checked-in overlays resolve app images to `ghcr.io/dhanigasree/...:dev-latest` and `ghcr.io/dhanigasree/...:prod-latest` for manual deployments. Before applying them on a real cluster, make sure those GHCR packages exist and are public, or update the `images:` section in the overlay to your own registry/repository names.

## Verification commands

Use these after deployment:

```bash
kubectl get all -n dev
kubectl get all -n prod
kubectl get pvc -n dev
kubectl get pvc -n prod
kubectl get networkpolicy -n dev
kubectl get networkpolicy -n prod
```

To open the UI locally:

```bash
kubectl port-forward -n dev svc/frontend 3000:80
kubectl port-forward -n prod svc/frontend 3001:80
```

Then open:

- `http://localhost:3000` for dev
- `http://localhost:3001` for prod

## Proof to capture for submission

- GitHub Actions run showing `quality-gate`, Trivy scan, and deploy success.
- GitHub CodeQL results.
- UI screenshot from `dev`.
- UI screenshot from `prod`.
- Output of `kubectl get all -n prod`.

## Notes for local clusters

The overlay storage files use `hostPath`-backed persistent volumes:

- `k8s-manifests/overlays/dev/storage.yaml`
- `k8s-manifests/overlays/prod/storage.yaml`

This is appropriate for Minikube, Docker Desktop Kubernetes, or other local clusters. For a cloud-managed cluster, replace the `PersistentVolume` definitions with your storage class or dynamic provisioning approach.

Admin
