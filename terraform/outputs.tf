output "application_url" {
  description = "Public URL for the ChargeOps frontend through the Application Load Balancer."
  value       = "http://${aws_lb.app.dns_name}"
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = aws_lb.app.dns_name
}

output "frontend_public_ip" {
  description = "Frontend EC2 public IP, mainly useful for troubleshooting."
  value       = aws_instance.frontend.public_ip
}

output "backend_private_ip" {
  description = "Backend EC2 private IP."
  value       = var.backend_private_ip
}

output "mongodb_private_ip" {
  description = "MongoDB EC2 private IP."
  value       = var.mongodb_private_ip
}
