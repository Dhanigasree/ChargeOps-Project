resource "aws_sqs_queue" "chargeops_events_dlq" {
  name                              = "chargeops-events-dlq"
  message_retention_seconds         = 1209600
  sqs_managed_sse_enabled           = true
  kms_data_key_reuse_period_seconds = 300

  tags = {
    Name = "chargeops-events-dlq"
  }
}

resource "aws_sqs_queue" "chargeops_events" {
  name                              = "chargeops-events"
  message_retention_seconds         = 345600
  receive_wait_time_seconds         = 20
  visibility_timeout_seconds        = 120
  sqs_managed_sse_enabled           = true
  kms_data_key_reuse_period_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.chargeops_events_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "chargeops-events"
  }
}

resource "aws_sqs_queue" "chargeops_notifications" {
  name                              = "chargeops-notifications"
  message_retention_seconds         = 345600
  receive_wait_time_seconds         = 20
  visibility_timeout_seconds        = 120
  sqs_managed_sse_enabled           = true
  kms_data_key_reuse_period_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.chargeops_events_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "chargeops-notifications"
  }
}

resource "aws_sqs_queue_redrive_allow_policy" "chargeops_events_dlq" {
  queue_url = aws_sqs_queue.chargeops_events_dlq.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns = [
      aws_sqs_queue.chargeops_events.arn,
      aws_sqs_queue.chargeops_notifications.arn
    ]
  })
}

data "aws_iam_policy_document" "chargeops_sqs_access" {
  statement {
    sid    = "AllowChargeOpsSqsEvents"
    effect = "Allow"

    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueUrl",
      "sqs:GetQueueAttributes",
      "sqs:ChangeMessageVisibility"
    ]

    resources = [
      aws_sqs_queue.chargeops_events.arn,
      aws_sqs_queue.chargeops_notifications.arn,
      aws_sqs_queue.chargeops_events_dlq.arn
    ]
  }
}

resource "aws_iam_policy" "chargeops_sqs_access" {
  name        = "${var.cluster_name}-sqs-access"
  description = "SQS permissions for ChargeOps EKS event publishers and workers"
  policy      = data.aws_iam_policy_document.chargeops_sqs_access.json
}

resource "aws_iam_role_policy_attachment" "payment_service_sqs_access" {
  role       = aws_iam_role.payment_service.name
  policy_arn = aws_iam_policy.chargeops_sqs_access.arn
}

data "aws_iam_policy_document" "booking_service_assume_role" {
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
      values   = ["system:serviceaccount:prod:booking-service"]
    }
  }
}

resource "aws_iam_role" "booking_service" {
  name               = "${var.cluster_name}-booking-service"
  assume_role_policy = data.aws_iam_policy_document.booking_service_assume_role.json

  tags = {
    Name = "${var.cluster_name}-booking-service"
  }
}

resource "aws_iam_role_policy_attachment" "booking_service_sqs_access" {
  role       = aws_iam_role.booking_service.name
  policy_arn = aws_iam_policy.chargeops_sqs_access.arn
}

data "aws_iam_policy_document" "invoice_worker_assume_role" {
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
      values   = ["system:serviceaccount:prod:invoice-worker"]
    }
  }
}

resource "aws_iam_role" "invoice_worker" {
  name               = "${var.cluster_name}-invoice-worker"
  assume_role_policy = data.aws_iam_policy_document.invoice_worker_assume_role.json

  tags = {
    Name = "${var.cluster_name}-invoice-worker"
  }
}

resource "aws_iam_role_policy_attachment" "invoice_worker_sqs_access" {
  role       = aws_iam_role.invoice_worker.name
  policy_arn = aws_iam_policy.chargeops_sqs_access.arn
}

resource "aws_iam_role_policy_attachment" "invoice_worker_invoice_storage" {
  role       = aws_iam_role.invoice_worker.name
  policy_arn = aws_iam_policy.payment_service.arn
}

data "aws_iam_policy_document" "notification_worker_assume_role" {
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
      values   = ["system:serviceaccount:prod:notification-worker"]
    }
  }
}

resource "aws_iam_role" "notification_worker" {
  name               = "${var.cluster_name}-notification-worker"
  assume_role_policy = data.aws_iam_policy_document.notification_worker_assume_role.json

  tags = {
    Name = "${var.cluster_name}-notification-worker"
  }
}

resource "aws_iam_role_policy_attachment" "notification_worker_sqs_access" {
  role       = aws_iam_role.notification_worker.name
  policy_arn = aws_iam_policy.chargeops_sqs_access.arn
}
