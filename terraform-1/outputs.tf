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
