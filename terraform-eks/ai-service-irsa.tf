data "aws_iam_policy_document" "ai_service_assume_role" {
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
      values   = ["system:serviceaccount:prod:ai-service"]
    }
  }
}

resource "aws_iam_role" "ai_service" {
  name               = "${var.cluster_name}-ai-service"
  assume_role_policy = data.aws_iam_policy_document.ai_service_assume_role.json

  tags = {
    Name = "${var.cluster_name}-ai-service"
  }
}

data "aws_iam_policy_document" "ai_service" {
  statement {
    sid    = "AllowBedrockModelInvocation"
    effect = "Allow"

    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream"
    ]

    resources = ["*"]
  }

  statement {
    sid    = "AllowMongoSecretRead"
    effect = "Allow"

    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]

    resources = [
      "arn:${data.aws_partition.current.partition}:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:chargeops/prod/ai-service/mongodb-*"
    ]
  }

  statement {
    sid    = "AllowSecretKmsDecrypt"
    effect = "Allow"

    actions = [
      "kms:Decrypt"
    ]

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["secretsmanager.${var.aws_region}.amazonaws.com"]
    }
  }

  statement {
    sid    = "AllowMonthlyReportStorage"
    effect = "Allow"

    actions = [
      "s3:PutObject",
      "s3:GetObject"
    ]

    resources = [
      "arn:${data.aws_partition.current.partition}:s3:::${var.reports_bucket_name}/ai-reports/*"
    ]
  }

  statement {
    sid    = "AllowMonthlyReportKms"
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

resource "aws_iam_policy" "ai_service" {
  name        = "${var.cluster_name}-ai-service-policy"
  description = "IAM permissions for ChargeOps AI service on EKS"
  policy      = data.aws_iam_policy_document.ai_service.json
}

resource "aws_iam_role_policy_attachment" "ai_service" {
  role       = aws_iam_role.ai_service.name
  policy_arn = aws_iam_policy.ai_service.arn
}
