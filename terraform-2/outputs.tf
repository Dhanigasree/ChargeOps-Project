output "application_url" {
  description = "Public ChargeOps URL through the web-tier ALB."
  value       = "http://${aws_lb.app.dns_name}"
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = aws_lb.app.dns_name
}

output "web_public_ip" {
  description = "Web-tier EC2 public IP for troubleshooting."
  value       = aws_instance.web.public_ip
}

output "app_private_ip" {
  description = "App-tier EC2 private IP."
  value       = aws_instance.app.private_ip
}

output "db_private_ip" {
  description = "Database-tier EC2 private IP."
  value       = aws_instance.db.private_ip
}

output "mongodb_root_username" {
  description = "MongoDB root username."
  value       = var.mongodb_root_username
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID used for ChargeOps."
  value       = var.enable_custom_domain ? aws_route53_zone.primary[0].zone_id : null
}

output "route53_name_servers" {
  description = "Route53 hosted zone name servers to configure at your domain registrar."
  value       = var.enable_custom_domain ? aws_route53_zone.primary[0].name_servers : []
}

output "route53_root_record" {
  description = "Root domain Route53 alias record."
  value       = var.enable_custom_domain ? aws_route53_record.root[0].fqdn : null
}

output "route53_www_record" {
  description = "WWW Route53 alias record."
  value       = var.enable_custom_domain ? aws_route53_record.www[0].fqdn : null
}

output "waf_arn" {
  description = "CloudFront WAF Web ACL ARN."
  value       = aws_wafv2_web_acl.cloudfront.arn
}

output "acm_dns_validation_records" {
  description = "DNS records needed to validate the ACM certificate if you later point chargeops.site to CloudFront."
  value = var.enable_custom_domain ? [
    for option in aws_acm_certificate.cloudfront[0].domain_validation_options : {
      name  = option.resource_record_name
      type  = option.resource_record_type
      value = option.resource_record_value
    }
  ] : []
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name for ChargeOps operations."
  value       = aws_cloudwatch_dashboard.chargeops.dashboard_name
}

output "sqs_queue_url" {
  description = "ChargeOps main SQS queue URL."
  value       = aws_sqs_queue.chargeops_events.id
}

output "sqs_queue_arn" {
  description = "ChargeOps main SQS queue ARN."
  value       = aws_sqs_queue.chargeops_events.arn
}

output "sqs_dlq_url" {
  description = "ChargeOps SQS dead-letter queue URL."
  value       = aws_sqs_queue.chargeops_dlq.id
}

output "sqs_dlq_arn" {
  description = "ChargeOps SQS dead-letter queue ARN."
  value       = aws_sqs_queue.chargeops_dlq.arn
}
