data "aws_availability_zones" "available" {
  state = "available"
}

resource "random_password" "mongodb_root_password" {
  length  = 32
  special = false
}

resource "random_id" "jwt_secret" {
  byte_length = 32
}

resource "random_id" "internal_service_api_key" {
  byte_length = 32
}
