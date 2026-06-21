output "cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "EKS API endpoint."
  value       = aws_eks_cluster.main.endpoint
}

output "node_group_name" {
  description = "Managed node group name."
  value       = aws_eks_node_group.main.node_group_name
}

output "oidc_arn" {
  description = "EKS OIDC provider ARN."
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "load_balancer_controller_role_arn" {
  description = "IRSA role ARN for AWS Load Balancer Controller."
  value       = aws_iam_role.load_balancer_controller.arn
}

output "ai_service_role_arn" {
  description = "IRSA role ARN for ChargeOps AI service."
  value       = aws_iam_role.ai_service.arn
}

output "ecr_repository_urls" {
  description = "ECR repository URLs by service."
  value       = { for name, repo in aws_ecr_repository.services : name => repo.repository_url }
}

output "private_subnet_ids" {
  description = "Private subnet IDs for EKS nodes."
  value       = values(aws_subnet.private)[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs for AWS load balancers."
  value       = values(aws_subnet.public)[*].id
}

output "vpc_id" {
  description = "VPC ID used by the EKS cluster."
  value       = aws_vpc.main.id
}

output "reports_bucket_name" {
  description = "Reports S3 bucket name."
  value       = aws_s3_bucket.chargeops["reports"].bucket
}

output "uploads_bucket_name" {
  description = "Uploads S3 bucket name."
  value       = aws_s3_bucket.chargeops["uploads"].bucket
}

output "payment_bills_bucket_name" {
  description = "Private payment invoice S3 bucket name."
  value       = aws_s3_bucket.chargeops["payment_bills"].bucket
}

output "payment_service_role_arn" {
  description = "IRSA role ARN for ChargeOps payment service invoice access."
  value       = aws_iam_role.payment_service.arn
}

output "sqs_queue_url" {
  description = "ChargeOps events SQS queue URL."
  value       = aws_sqs_queue.chargeops_events.id
}

output "sqs_queue_arn" {
  description = "ChargeOps events SQS queue ARN."
  value       = aws_sqs_queue.chargeops_events.arn
}

output "sqs_dlq_url" {
  description = "ChargeOps events SQS dead-letter queue URL."
  value       = aws_sqs_queue.chargeops_events_dlq.id
}

output "sqs_notification_queue_url" {
  description = "ChargeOps notification worker SQS queue URL."
  value       = aws_sqs_queue.chargeops_notifications.id
}

output "booking_service_role_arn" {
  description = "IRSA role ARN for ChargeOps booking service SQS publishing."
  value       = aws_iam_role.booking_service.arn
}

output "invoice_worker_role_arn" {
  description = "IRSA role ARN for ChargeOps invoice worker."
  value       = aws_iam_role.invoice_worker.arn
}

output "notification_worker_role_arn" {
  description = "IRSA role ARN for ChargeOps notification worker."
  value       = aws_iam_role.notification_worker.arn
}
