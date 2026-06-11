resource "aws_instance" "frontend" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public_1.id
  vpc_security_group_ids      = [aws_security_group.frontend_sg.id]
  associate_public_ip_address = true
  key_name                    = var.key_name

  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/userdata/frontend.sh", {
    app_repo_url    = var.app_repo_url
    app_repo_branch = var.app_repo_branch
    api_gateway_url = "http://${var.backend_private_ip}:8000"
  })

  tags = {
    Name = "frontend-server"
  }
}
