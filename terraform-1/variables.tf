variable "aws_region" {
  description = "AWS region where the 3-tier ChargeOps stack is deployed."
  type        = string
  default     = "ap-south-1"
}

variable "ami_id" {
  description = "Amazon Linux EC2 AMI ID."
  type        = string
  default     = "ami-07a00cf47dbbc844c"
}

variable "instance_type" {
  description = "EC2 instance type for all three tiers."
  type        = string
  default     = "t2.micro"
}

variable "key_name" {
  description = "Existing EC2 key pair name for SSH."
  type        = string
}

variable "app_repo_url" {
  description = "Git repository URL containing this ChargeOps project."
  type        = string
}

variable "app_repo_branch" {
  description = "Git branch to clone on EC2 instances."
  type        = string
  default     = "main"
}

variable "vpc_cidr" {
  description = "CIDR block for the custom VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_1_cidr" {
  type    = string
  default = "10.20.1.0/24"
}

variable "public_subnet_2_cidr" {
  type    = string
  default = "10.20.2.0/24"
}

variable "private_app_subnet_cidr" {
  type    = string
  default = "10.20.3.0/24"
}

variable "private_db_subnet_cidr" {
  type    = string
  default = "10.20.4.0/24"
}

variable "app_private_ip" {
  description = "Static private IP for the app-tier EC2 instance."
  type        = string
  default     = "10.20.3.10"
}

variable "db_private_ip" {
  description = "Static private IP for the database-tier EC2 instance."
  type        = string
  default     = "10.20.4.10"
}

variable "mongodb_root_username" {
  description = "MongoDB root username."
  type        = string
  default     = "chargeops_admin"
}

variable "allowed_origins" {
  description = "Comma-separated allowed CORS origins. Use * for demo deployments."
  type        = string
  default     = "*"
}

variable "stripe_secret_key" {
  description = "Optional Stripe secret key. Leave blank for mock payment flow."
  type        = string
  default     = ""
  sensitive   = true
}
