variable "aws_region" {
  default = "ap-south-1"
}

variable "ami_id" {
  default = "ami-07a00cf47dbbc844c"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "public_subnet_1" {
  default = "10.0.1.0/24"
}

variable "public_subnet_2" {
  default = "10.0.2.0/24"
}

variable "private_subnet_1" {
  default = "10.0.3.0/24"
}

variable "private_subnet_2" {
  default = "10.0.4.0/24"
}

variable "backend_private_ip" {
  description = "Stable private IP for the backend EC2 instance. Keep this inside private_subnet_1."
  default     = "10.0.3.27"
}

variable "mongodb_private_ip" {
  description = "Stable private IP for the MongoDB EC2 instance. Keep this inside private_subnet_2."
  default     = "10.0.4.69"
}

variable "instance_type" {
  default = "t2.micro"
}

variable "key_name" {
  default = "your-keypair-name"
}

variable "app_repo_url" {
  description = "Git repository URL containing the ChargeOps project. The EC2 user-data scripts clone this repo."
  default     = "CHANGE_ME_TO_YOUR_CHARGEOPS_GIT_REPO_URL"
}

variable "app_repo_branch" {
  description = "Git branch to deploy on the EC2 instances."
  default     = "main"
}

variable "allowed_origins" {
  description = "Comma-separated CORS origins for backend services. Use * for demos."
  default     = "*"
}

variable "mongodb_root_username" {
  description = "MongoDB root username created by the MongoDB EC2 user-data script."
  default     = "chargeops_admin"
  sensitive   = true
}

variable "mongodb_root_password" {
  description = "MongoDB root password created by the MongoDB EC2 user-data script."
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret used by all backend services."
  sensitive   = true
}

variable "internal_service_api_key" {
  description = "Shared internal API key used for service-to-service calls."
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Optional Stripe secret key. Leave blank for mock payment flow."
  default     = ""
  sensitive   = true
}
