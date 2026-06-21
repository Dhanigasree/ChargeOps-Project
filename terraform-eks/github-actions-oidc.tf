locals {
  github_actions_oidc_url = "https://token.actions.githubusercontent.com"
  github_repository       = "Dhanigasree/ChargeOps"
  github_ecr_repository_arns = [
    for repository in var.ecr_repositories :
    "arn:${data.aws_partition.current.partition}:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/chargeops/${repository}"
  ]
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url = local.github_actions_oidc_url

  client_id_list = [
    "sts.amazonaws.com"
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]

  tags = {
    Name = "github-actions-oidc"
  }
}

data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    actions = [
      "sts:AssumeRoleWithWebIdentity"
    ]

    principals {
      type = "Federated"
      identifiers = [
        aws_iam_openid_connect_provider.github_actions.arn
      ]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values = [
        "sts.amazonaws.com"
      ]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${local.github_repository}:*"
      ]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "chargeops-github-actions-role"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json

  tags = {
    Name = "chargeops-github-actions-role"
  }
}

resource "aws_iam_role_policy_attachment" "github_actions_ecr_power_user" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

data "aws_iam_policy_document" "github_actions_ci" {
  statement {
    sid    = "AllowIdentityCheck"
    effect = "Allow"

    actions = [
      "sts:GetCallerIdentity"
    ]

    resources = [
      "*"
    ]
  }

  statement {
    sid    = "AllowEksClusterDescribe"
    effect = "Allow"

    actions = [
      "eks:DescribeCluster"
    ]

    resources = [
      "arn:${data.aws_partition.current.partition}:eks:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/${var.cluster_name}"
    ]
  }

  statement {
    sid    = "AllowEcrLogin"
    effect = "Allow"

    actions = [
      "ecr:GetAuthorizationToken"
    ]

    resources = [
      "*"
    ]
  }

  statement {
    sid    = "AllowChargeOpsEcrPushPull"
    effect = "Allow"

    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart"
    ]

    resources = [
      for repository_arn in local.github_ecr_repository_arns : repository_arn
    ]
  }
}

resource "aws_iam_policy" "github_actions_ci" {
  name        = "chargeops-github-actions-ci-policy"
  description = "Least-privilege CI permissions for ChargeOps GitHub Actions"
  policy      = data.aws_iam_policy_document.github_actions_ci.json

  tags = {
    Name = "chargeops-github-actions-ci-policy"
  }
}

resource "aws_iam_role_policy_attachment" "github_actions_ci" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions_ci.arn
}

output "github_actions_role_arn" {
  description = "IAM role ARN to store in GitHub secret AWS_GITHUB_ACTIONS_ROLE_ARN."
  value       = aws_iam_role.github_actions.arn
}

output "github_oidc_provider_arn" {
  description = "GitHub Actions OIDC provider ARN."
  value       = aws_iam_openid_connect_provider.github_actions.arn
}
