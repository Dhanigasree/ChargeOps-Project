locals {
  ec2_instances = {
    web = {
      instance_id = aws_instance.web.id
      name        = "chargeops-web-tier"
    }
    app = {
      instance_id = aws_instance.app.id
      name        = "chargeops-app-tier"
    }
    db = {
      instance_id = aws_instance.db.id
      name        = "chargeops-db-tier"
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_high" {
  alarm_name          = "${var.project_name}-alb-5xx-high"
  alarm_description   = "ALB is returning too many 5xx responses."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = var.alb_5xx_alarm_threshold
  treat_missing_data  = "notBreaching"
  actions_enabled     = length(var.cloudwatch_alarm_actions) > 0
  alarm_actions       = var.cloudwatch_alarm_actions
  ok_actions          = var.cloudwatch_alarm_actions

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-alb-5xx-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "target_unhealthy" {
  alarm_name          = "${var.project_name}-frontend-target-unhealthy"
  alarm_description   = "Frontend target group has unhealthy targets."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1
  treat_missing_data  = "breaching"
  actions_enabled     = length(var.cloudwatch_alarm_actions) > 0
  alarm_actions       = var.cloudwatch_alarm_actions
  ok_actions          = var.cloudwatch_alarm_actions

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
    TargetGroup  = aws_lb_target_group.web.arn_suffix
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-frontend-target-unhealthy"
  })
}

resource "aws_cloudwatch_metric_alarm" "ec2_cpu_high" {
  for_each = local.ec2_instances

  alarm_name          = "${var.project_name}-${each.key}-cpu-high"
  alarm_description   = "${each.value.name} CPU utilization is high."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = var.ec2_cpu_alarm_threshold
  treat_missing_data  = "notBreaching"
  actions_enabled     = length(var.cloudwatch_alarm_actions) > 0
  alarm_actions       = var.cloudwatch_alarm_actions
  ok_actions          = var.cloudwatch_alarm_actions

  dimensions = {
    InstanceId = each.value.instance_id
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${each.key}-cpu-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx_high" {
  provider            = aws.us_east_1
  alarm_name          = "${var.project_name}-cloudfront-5xx-high"
  alarm_description   = "CloudFront is returning too many 5xx responses."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = var.cloudfront_5xx_error_rate_threshold
  treat_missing_data  = "notBreaching"
  actions_enabled     = length(var.cloudwatch_alarm_actions) > 0
  alarm_actions       = var.cloudwatch_alarm_actions
  ok_actions          = var.cloudwatch_alarm_actions

  dimensions = {
    DistributionId = aws_cloudfront_distribution.frontend.id
    Region         = "Global"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-cloudfront-5xx-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests_high" {
  provider            = aws.us_east_1
  alarm_name          = "${var.project_name}-waf-blocked-requests-high"
  alarm_description   = "WAF is blocking an elevated number of CloudFront requests."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = var.waf_blocked_requests_alarm_threshold
  treat_missing_data  = "notBreaching"
  actions_enabled     = length(var.cloudwatch_alarm_actions) > 0
  alarm_actions       = var.cloudwatch_alarm_actions
  ok_actions          = var.cloudwatch_alarm_actions

  dimensions = {
    Region = "Global"
    Rule   = "ALL"
    WebACL = "${var.project_name}-cloudfront-waf"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-waf-blocked-requests-high"
  })
}

resource "aws_cloudwatch_dashboard" "chargeops" {
  dashboard_name = "${var.project_name}-operations-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "CloudFront Traffic"
          region  = "us-east-1"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.frontend.id, "Region", "Global", { stat = "Sum" }],
            [".", "5xxErrorRate", ".", ".", ".", ".", { stat = "Average", yAxis = "right" }],
            [".", "4xxErrorRate", ".", ".", ".", ".", { stat = "Average", yAxis = "right" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "ALB Requests and Errors"
          region  = var.aws_region
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.app.arn_suffix, { stat = "Sum" }],
            [".", "HTTPCode_ELB_5XX_Count", ".", ".", { stat = "Sum", yAxis = "right" }],
            [".", "TargetResponseTime", ".", ".", { stat = "Average", yAxis = "right" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "EC2 CPU Utilization"
          region  = var.aws_region
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.web.id, { label = "web", stat = "Average" }],
            [".", ".", ".", aws_instance.app.id, { label = "app", stat = "Average" }],
            [".", ".", ".", aws_instance.db.id, { label = "db", stat = "Average" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "WAF Requests"
          region  = "us-east-1"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/WAFV2", "AllowedRequests", "Region", "Global", "Rule", "ALL", "WebACL", "${var.project_name}-cloudfront-waf", { stat = "Sum" }],
            [".", "BlockedRequests", ".", ".", ".", ".", ".", ".", { stat = "Sum" }]
          ]
          period = 300
        }
      },
      {
        type   = "alarm"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        properties = {
          title = "ChargeOps Alarms"
          alarms = concat(
            [
              aws_cloudwatch_metric_alarm.alb_5xx_high.arn,
              aws_cloudwatch_metric_alarm.target_unhealthy.arn,
              aws_cloudwatch_metric_alarm.cloudfront_5xx_high.arn,
              aws_cloudwatch_metric_alarm.waf_blocked_requests_high.arn
            ],
            [for alarm in aws_cloudwatch_metric_alarm.ec2_cpu_high : alarm.arn]
          )
        }
      }
    ]
  })
}
