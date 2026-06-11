resource "aws_instance" "backend" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.private_1.id
  private_ip             = var.backend_private_ip
  vpc_security_group_ids = [aws_security_group.backend_sg.id]
  key_name               = var.key_name

  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/userdata/backend.sh", {
    app_repo_url             = var.app_repo_url
    app_repo_branch          = var.app_repo_branch
    mongodb_private_ip       = var.mongodb_private_ip
    mongodb_root_username    = var.mongodb_root_username
    mongodb_root_password    = var.mongodb_root_password
    jwt_secret               = var.jwt_secret
    internal_service_api_key = var.internal_service_api_key
    allowed_origins          = var.allowed_origins
    stripe_secret_key        = var.stripe_secret_key
    frontend_app_url         = "http://${aws_lb.app.dns_name}"
  })

  tags = {
    Name = "backend-server"
  }
}
