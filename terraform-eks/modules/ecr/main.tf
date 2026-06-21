resource "aws_ecr_repository" "this" {
  for_each = var.repositories

  name                 = "chargeops/${each.key}"
  image_tag_mutability = "MUTABLE"

  dynamic "encryption_configuration" {
    for_each = var.kms_key_arn == null ? [] : [var.kms_key_arn]
    content {
      encryption_type = "KMS"
      kms_key         = encryption_configuration.value
    }
  }

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, {
    Name = "chargeops/${each.key}"
  })
}
