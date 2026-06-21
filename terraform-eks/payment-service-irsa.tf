data "aws_iam_policy_document" "payment_service_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.eks.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_provider_host}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_provider_host}:sub"
      values   = ["system:serviceaccount:prod:payment-service"]
    }
  }
}

resource "aws_iam_role" "payment_service" {
  name               = "${var.cluster_name}-payment-service"
  assume_role_policy = data.aws_iam_policy_document.payment_service_assume_role.json

  tags = {
    Name = "${var.cluster_name}-payment-service"
  }
}

data "aws_iam_policy_document" "payment_service" {
  statement {
    sid    = "AllowPaymentInvoiceStorage"
    effect = "Allow"

    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject"
    ]

    resources = [
      "arn:${data.aws_partition.current.partition}:s3:::${var.payment_bills_bucket_name}/users/*"
    ]
  }

  statement {
    sid    = "AllowPaymentInvoiceBucketRead"
    effect = "Allow"

    actions = [
      "s3:ListBucket"
    ]

    resources = [
      "arn:${data.aws_partition.current.partition}:s3:::${var.payment_bills_bucket_name}"
    ]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["users/*"]
    }
  }

  statement {
    sid    = "AllowPaymentInvoiceKms"
    effect = "Allow"

    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:GenerateDataKey"
    ]

    resources = [
      aws_kms_key.s3.arn
    ]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["s3.${var.aws_region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "payment_service" {
  name        = "${var.cluster_name}-payment-service-policy"
  description = "IAM permissions for ChargeOps payment invoice storage on S3"
  policy      = data.aws_iam_policy_document.payment_service.json
}

resource "aws_iam_role_policy_attachment" "payment_service" {
  role       = aws_iam_role.payment_service.name
  policy_arn = aws_iam_policy.payment_service.arn
}
