data "aws_caller_identity" "current" {}

resource "aws_sqs_queue" "chargeops_dlq" {
  name                              = "${var.project_name}-events-dlq"
  message_retention_seconds         = var.sqs_dlq_message_retention_seconds
  sqs_managed_sse_enabled           = true
  kms_data_key_reuse_period_seconds = 300

  tags = merge(var.tags, {
    Name = "${var.project_name}-events-dlq"
  })
}

resource "aws_sqs_queue" "chargeops_events" {
  name                              = "${var.project_name}-events"
  delay_seconds                     = 0
  max_message_size                  = 262144
  message_retention_seconds         = var.sqs_message_retention_seconds
  receive_wait_time_seconds         = var.sqs_receive_wait_time_seconds
  visibility_timeout_seconds        = var.sqs_visibility_timeout_seconds
  sqs_managed_sse_enabled           = true
  kms_data_key_reuse_period_seconds = 300

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.chargeops_dlq.arn
    maxReceiveCount     = var.sqs_max_receive_count
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-events"
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "chargeops_dlq" {
  queue_url = aws_sqs_queue.chargeops_dlq.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.chargeops_events.arn]
  })
}

data "aws_iam_policy_document" "sqs_app_access" {
  statement {
    sid    = "ChargeOpsSqsQueueAccess"
    effect = "Allow"

    actions = [
      "sqs:ChangeMessageVisibility",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
      "sqs:ReceiveMessage",
      "sqs:SendMessage",
    ]

    resources = [
      aws_sqs_queue.chargeops_events.arn,
      aws_sqs_queue.chargeops_dlq.arn,
    ]
  }
}

resource "aws_iam_policy" "sqs_app_access" {
  name        = "${var.project_name}-sqs-app-access"
  description = "Allow ChargeOps EC2 application tier to publish and consume SQS messages."
  policy      = data.aws_iam_policy_document.sqs_app_access.json

  tags = merge(var.tags, {
    Name = "${var.project_name}-sqs-app-access"
  })
}

resource "aws_iam_role_policy_attachment" "sqs_app_access" {
  role       = aws_iam_role.ssm.name
  policy_arn = aws_iam_policy.sqs_app_access.arn
}

resource "aws_sqs_queue_policy" "chargeops_events" {
  queue_url = aws_sqs_queue.chargeops_events.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action   = "sqs:*"
        Resource = aws_sqs_queue.chargeops_events.arn
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "sqs_visible_messages_high" {
  alarm_name          = "${var.project_name}-sqs-visible-messages-high"
  alarm_description   = "ChargeOps SQS queue has too many visible messages waiting to be processed."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = var.sqs_visible_messages_alarm_threshold
  treat_missing_data  = "notBreaching"
  actions_enabled     = length(var.cloudwatch_alarm_actions) > 0
  alarm_actions       = var.cloudwatch_alarm_actions
  ok_actions          = var.cloudwatch_alarm_actions

  dimensions = {
    QueueName = aws_sqs_queue.chargeops_events.name
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-sqs-visible-messages-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages_high" {
  alarm_name          = "${var.project_name}-sqs-dlq-messages-high"
  alarm_description   = "ChargeOps SQS dead-letter queue has messages that need investigation."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 1
  treat_missing_data  = "notBreaching"
  actions_enabled     = length(var.cloudwatch_alarm_actions) > 0
  alarm_actions       = var.cloudwatch_alarm_actions
  ok_actions          = var.cloudwatch_alarm_actions

  dimensions = {
    QueueName = aws_sqs_queue.chargeops_dlq.name
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-sqs-dlq-messages-high"
  })
}
