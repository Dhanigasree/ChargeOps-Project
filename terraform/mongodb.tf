resource "aws_instance" "mongodb" {
  ami                    = var.ami_id
  instance_type          = "t2.micro"
  subnet_id              = aws_subnet.private_2.id
  private_ip             = var.mongodb_private_ip
  vpc_security_group_ids = [aws_security_group.mongodb_sg.id]
  key_name               = var.key_name

  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/userdata/mongodb.sh", {
    mongodb_root_username = var.mongodb_root_username
    mongodb_root_password = var.mongodb_root_password
  })

  tags = {
    Name = "mongodb-server"
  }
}
