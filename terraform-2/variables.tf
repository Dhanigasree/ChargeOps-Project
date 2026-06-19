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

variable "project_name" {
  description = "Project name used for CloudFront, WAF, and ACM resource naming."
  type        = string
  default     = "chargeops"
}

variable "domain_name" {
  description = "Primary public domain name for ChargeOps."
  type        = string
  default     = "chargeops.site"
}

variable "enable_custom_domain" {
  description = "Create Route53 records and an ACM certificate for the custom CloudFront domain."
  type        = bool
  default     = false
}

variable "www_domain_name" {
  description = "WWW public domain name for ChargeOps."
  type        = string
  default     = "www.chargeops.site"
}

variable "cloudfront_price_class" {
  description = "CloudFront price class for the frontend distribution."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "cloudfront_price_class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "waf_rate_limit" {
  description = "Maximum requests allowed from a single IP address in a 5-minute WAF evaluation window."
  type        = number
  default     = 2000
}

variable "tags" {
  description = "Common tags applied to supported CloudFront architecture resources."
  type        = map(string)
  default = {
    Project     = "ChargeOps"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

variable "cloudwatch_alarm_actions" {
  description = "Optional SNS topic ARNs or action ARNs for CloudWatch alarm and OK notifications."
  type        = list(string)
  default     = []
}

variable "alb_5xx_alarm_threshold" {
  description = "ALB 5xx count threshold per 5-minute period."
  type        = number
  default     = 5
}

variable "ec2_cpu_alarm_threshold" {
  description = "Average EC2 CPU utilization percentage threshold for alarms."
  type        = number
  default     = 80
}

variable "cloudfront_5xx_error_rate_threshold" {
  description = "CloudFront 5xx error rate percentage threshold."
  type        = number
  default     = 5
}

variable "waf_blocked_requests_alarm_threshold" {
  description = "WAF blocked request count threshold per 5-minute period."
  type        = number
  default     = 100
}

variable "sqs_message_retention_seconds" {
  description = "How long SQS keeps messages in the main queue."
  type        = number
  default     = 345600
}

variable "sqs_dlq_message_retention_seconds" {
  description = "How long SQS keeps messages in the dead-letter queue."
  type        = number
  default     = 1209600
}

variable "sqs_visibility_timeout_seconds" {
  description = "SQS visibility timeout for messages being processed."
  type        = number
  default     = 60
}

variable "sqs_receive_wait_time_seconds" {
  description = "SQS long polling wait time."
  type        = number
  default     = 10
}

variable "sqs_max_receive_count" {
  description = "Number of failed receives before moving a message to the dead-letter queue."
  type        = number
  default     = 5
}

variable "sqs_visible_messages_alarm_threshold" {
  description = "Visible message count threshold for the main SQS queue alarm."
  type        = number
  default     = 100
}
