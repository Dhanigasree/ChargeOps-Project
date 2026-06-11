resource "aws_instance" "web" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public_1.id
  vpc_security_group_ids      = [aws_security_group.web.id]
  associate_public_ip_address = true
  key_name                    = var.key_name

  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/userdata/web.sh", {
    app_repo_url    = var.app_repo_url
    app_repo_branch = var.app_repo_branch
    api_gateway_url = "http://${var.app_private_ip}:8000"
  })

  tags = {
    Name = "chargeops-web-tier"
    Tier = "web"
  }
}

resource "aws_instance" "app" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.private_app.id
  private_ip             = var.app_private_ip
  vpc_security_group_ids = [aws_security_group.app.id]
  key_name               = var.key_name
  iam_instance_profile   = aws_iam_instance_profile.ssm.name

  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/userdata/app.sh", {
    app_repo_url             = var.app_repo_url
    app_repo_branch          = var.app_repo_branch
    mongodb_private_ip       = var.db_private_ip
    mongodb_root_username    = var.mongodb_root_username
    mongodb_root_password    = random_password.mongodb_root_password.result
    jwt_secret               = "Jwt-${random_id.jwt_secret.hex}"
    internal_service_api_key = "Internal-${random_id.internal_service_api_key.hex}"
    allowed_origins          = var.allowed_origins
    stripe_secret_key        = var.stripe_secret_key
    frontend_app_url         = "http://${aws_lb.app.dns_name}"
    aws_region               = var.aws_region
  })

  tags = {
    Name = "chargeops-app-tier"
    Tier = "app"
  }

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }
}

resource "aws_instance" "db" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.private_db.id
  private_ip             = var.db_private_ip
  vpc_security_group_ids = [aws_security_group.db.id]
  key_name               = var.key_name
  iam_instance_profile   = aws_iam_instance_profile.ssm.name

  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/userdata/db.sh", {
    mongodb_root_username = var.mongodb_root_username
    mongodb_root_password = random_password.mongodb_root_password.result
    aws_region            = var.aws_region
  })

  tags = {
    Name = "chargeops-db-tier"
    Tier = "db"
  }

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }
}
