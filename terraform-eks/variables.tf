variable "aws_region" {
  description = "AWS region for the ChargeOps EKS platform."
  type        = string
  default     = "ap-south-1"
}

variable "cluster_name" {
  description = "EKS cluster name."
  type        = string
  default     = "chargeops-eks"
}

variable "cluster_admin_principal_arn" {
  description = "IAM user or role ARN that receives Kubernetes cluster-admin access through the EKS access API."
  type        = string
  default     = "arn:aws:iam::497676936148:user/Dhaniga"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version. Keep this aligned with the newest version supported in your AWS region."
  type        = string
  default     = "1.33"
}

variable "vpc_cidr" {
  description = "VPC CIDR for EKS."
  type        = string
  default     = "10.40.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs for load balancers and NAT gateways."
  type        = list(string)
  default     = ["10.40.1.0/24", "10.40.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs for EKS worker nodes."
  type        = list(string)
  default     = ["10.40.11.0/24", "10.40.12.0/24"]
}

variable "node_instance_types" {
  description = "Managed node group instance types."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_group_min_size" {
  description = "Minimum EKS managed node group size."
  type        = number
  default     = 2
}

variable "node_group_desired_size" {
  description = "Desired EKS managed node group size."
  type        = number
  default     = 3
}

variable "node_group_max_size" {
  description = "Maximum EKS managed node group size."
  type        = number
  default     = 4
}

variable "oidc_thumbprint" {
  description = "Root CA thumbprint used by the EKS OIDC provider."
  type        = string
  default     = "9e99a48a9960b14926bb7f3b02e22da0ecd4050c"
}

variable "state_bucket_name" {
  description = "S3 bucket for Terraform state."
  type        = string
  default     = "chargeops-terraform-state-497676936148-ap-south-1"
}

variable "state_lock_table_name" {
  description = "DynamoDB table for Terraform state locking."
  type        = string
  default     = "chargeops-terraform-locks"
}

variable "reports_bucket_name" {
  description = "S3 bucket for application and operational reports."
  type        = string
  default     = "chargeops-reports-497676936148-ap-south-1"
}

variable "uploads_bucket_name" {
  description = "S3 bucket for ChargeOps uploads."
  type        = string
  default     = "chargeops-uploads-497676936148-ap-south-1"
}

variable "payment_bills_bucket_name" {
  description = "Private S3 bucket for generated payment invoice PDFs."
  type        = string
  default     = "chargeops-payment-bills-497676936148-ap-south-1"
}

variable "ecr_repositories" {
  description = "ECR repositories for ChargeOps services."
  type        = set(string)
  default = [
    "frontend",
    "api-gateway",
    "auth-service",
    "user-service",
    "station-service",
    "booking-service",
    "payment-service",
    "review-service",
    "admin-service",
    "ai-service"
  ]
}

variable "tags" {
  description = "Common AWS tags."
  type        = map(string)
  default = {
    Project     = "ChargeOps"
    Environment = "production"
    ManagedBy   = "Terraform"
    Platform    = "EKS"
  }
}
