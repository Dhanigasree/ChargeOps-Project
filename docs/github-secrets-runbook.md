# GitHub Actions and SonarQube Secrets Runbook

Use this checklist to finish the CI/CD and DevSecOps setup for ChargeOps.
 
## 1. Docker Hub Secrets

In GitHub:

1. Open the repository.
2. Go to `Settings` > `Secrets and variables` > `Actions`.
3. Add these repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

`DOCKERHUB_TOKEN` should be a Docker Hub access token, not your password.

## 2. Kubernetes Environment Secrets

Create two GitHub Environments:

- `dev`
- `prod`

For each environment, add:

- `KUBE_CONFIG`
- `MONGO_ROOT_USERNAME`
- `MONGO_ROOT_PASSWORD`
- `JWT_SECRET`
- `INTERNAL_SERVICE_API_KEY`
- `STRIPE_SECRET_KEY`

### KUBE_CONFIG value

On the machine that has working cluster access:

```bash
base64 -w 0 ~/.kube/config
```

Paste the output as the `KUBE_CONFIG` secret.

## 3. SonarQube Secrets

Add these repository secrets in `Settings` > `Secrets and variables` > `Actions`:

- `SONAR_TOKEN`
- `SONAR_HOST_URL`
- `SONAR_PROJECT_KEY`

Example values:

- `SONAR_HOST_URL`: `http://<your-sonarqube-server>:9000`
- `SONAR_PROJECT_KEY`: `chargeops`

If these three secrets are not set, the SonarQube stage is skipped safely.

## 4. Workflow Trigger Logic

- push to `develop` -> deploy to `dev`
- push to `main` -> deploy to `prod`

## 5. Kubernetes Cleanup Commands

If old ReplicaSets or broken pods remain in `dev`:

```bash
kubectl delete deployment mongodb api-gateway auth-service user-service station-service booking-service payment-service review-service admin-service frontend -n dev --ignore-not-found=true
kubectl delete rs --all -n dev --ignore-not-found=true
kubectl delete pod --all -n dev --ignore-not-found=true
kubectl apply -f k8s/dev/
kubectl get pods -n dev -w
```

For prod:

```bash
kubectl delete deployment mongodb api-gateway auth-service user-service station-service booking-service payment-service review-service admin-service frontend -n prod --ignore-not-found=true
kubectl delete rs --all -n prod --ignore-not-found=true
kubectl delete pod --all -n prod --ignore-not-found=true
kubectl apply -f k8s/prod/
kubectl get pods -n prod -w
```

## 6. Recommended Verification Commands

```bash
kubectl get all -n dev
kubectl get all -n prod
kubectl get pvc -n dev
kubectl get pvc -n prod
kubectl get networkpolicy -n dev
kubectl get networkpolicy -n prod
```
