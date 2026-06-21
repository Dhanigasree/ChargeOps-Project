# ChargeOps EKS Terraform

This folder creates a new EKS platform for ChargeOps without modifying the existing EC2 Terraform stack in `terraform-2`.

## What It Creates

- VPC across 2 Availability Zones
- Public subnets for internet-facing AWS load balancers
- Private subnets for EKS managed nodes
- Internet Gateway and one NAT Gateway per AZ
- EKS cluster: `chargeops-eks`
- Managed node group with min 2, desired 2, max 4 nodes
- KMS encryption for EKS secrets, EBS, CloudWatch logs, and S3
- ECR repositories for every ChargeOps service, including `ai-service`
- OIDC provider and IRSA support
- AWS Load Balancer Controller IAM role
- S3 buckets for Terraform state, reports, and uploads
- S3 native Terraform state lockfile
- DynamoDB lock table for compatibility with older Terraform workflows
- CloudWatch Container Insights log groups and dashboard

## Initialize With Local State

For now this stack uses local Terraform state so `terraform init` does not require a pre-existing S3 bucket.

```bash
cd terraform-eks
terraform init
```

After the stack creates the Terraform state bucket, you can optionally enable the commented S3 backend in `backend.tf` and migrate state:

```bash
terraform init -migrate-state
```

## Deploy EKS

```bash
terraform plan
terraform apply
```

## Connect kubectl

```bash
aws eks update-kubeconfig --region ap-south-1 --name chargeops-eks
kubectl get nodes
```

## Install AWS Load Balancer Controller

Terraform creates the IAM role. Install the controller into the cluster:

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=chargeops-eks \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="$(terraform output -raw load_balancer_controller_role_arn)" \
  --set region=ap-south-1 \
  --set vpcId="$(terraform output -raw vpc_id 2>/dev/null || aws eks describe-cluster --region ap-south-1 --name chargeops-eks --query 'cluster.resourcesVpcConfig.vpcId' --output text)"
```

## Deploy ChargeOps With Existing Manifests

The repo already has Kubernetes and ArgoCD manifests:

- `k8s/prod`
- `k8s/dev`
- `k8s/chargeops`
- `argocd/chargeops-prod-app.yaml`
- `argocd/chargeops-ai-service-app.yaml`

After the cluster is ready:

```bash
kubectl apply -f k8s/argocd/prod/auth-service-app.yaml
kubectl apply -f k8s/argocd/prod/admin-service-app.yaml
kubectl apply -f k8s/argocd/prod/frontend-app.yaml
kubectl apply -f argocd/chargeops-ai-service-app.yaml
```

If using the app-of-apps manifests:

```bash
kubectl apply -f argocd/chargeops-prod-app.yaml
```

## MongoDB Atlas Migration

For EKS, use MongoDB Atlas instead of the in-cluster MongoDB manifests:

1. Create an Atlas cluster.
2. Allow EKS node/NAT egress IPs in the Atlas IP access list.
3. Create database users for each service or one scoped production user.
4. Store the Atlas URI in Kubernetes Secrets or External Secrets.
5. Update service manifests to set `MONGODB_URI` from the Atlas secret.
6. Remove or skip `mongodb.yaml` from production kustomization when Atlas is active.

## Expose the Application

With AWS Load Balancer Controller installed, create an Ingress for the frontend/API Gateway path. The controller will provision an ALB in the public subnets.

Next migration phase:

1. Add an Ingress manifest for ChargeOps.
2. Point Route53 to the ALB.
3. Put CloudFront and WAF in front of that ALB.
4. Move traffic from the EC2 ALB to the EKS ALB.

## Migration From EC2 to EKS

1. Keep the current EC2 stack running.
2. Apply `terraform-eks`.
3. Build and push images to the ECR repositories from `terraform output ecr_repository_urls`.
4. Update Kubernetes image references to ECR.
5. Configure MongoDB Atlas secrets.
6. Install AWS Load Balancer Controller.
7. Deploy ArgoCD applications to EKS.
8. Validate health endpoints and sign-in.
9. Switch Route53/CloudFront origin from EC2 ALB to EKS ALB.
10. Decommission EC2 after traffic is stable.
