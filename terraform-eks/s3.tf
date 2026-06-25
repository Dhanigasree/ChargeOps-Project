locals {
  s3_buckets = {
    terraform_state = var.state_bucket_name
    reports         = var.reports_bucket_name
    uploads         = var.uploads_bucket_name
    payment_bills   = var.payment_bills_bucket_name
  }
}

resource "aws_s3_bucket" "chargeops" {
  for_each = local.s3_buckets

  bucket        = each.value
  force_destroy = true

  tags = {
    Name = each.value
  }
}

resource "aws_s3_bucket_versioning" "chargeops" {
  for_each = aws_s3_bucket.chargeops

  bucket = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "chargeops" {
  for_each = aws_s3_bucket.chargeops

  bucket = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "chargeops" {
  for_each = aws_s3_bucket.chargeops

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "chargeops" {
  for_each = aws_s3_bucket.chargeops

  bucket = each.value.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "chargeops_payment_bills" {
  bucket = aws_s3_bucket.chargeops["payment_bills"].id

  rule {
    id     = "retain-current-invoices-and-expire-old-versions"
    status = "Enabled"

    filter {
      prefix = "users/"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = var.state_lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.s3.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = var.state_lock_table_name
  }
}
