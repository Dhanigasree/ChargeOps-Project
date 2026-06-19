resource "aws_cloudfront_cache_policy" "frontend_default" {
  name        = "${var.project_name}-frontend-default-cache"
  comment     = "Default frontend cache policy for ChargeOps CloudFront."
  default_ttl = 300
  max_ttl     = 3600
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "frontend_static" {
  name        = "${var.project_name}-frontend-static-cache"
  comment     = "Long-lived cache policy for ChargeOps frontend static assets."
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 3600

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_origin_request_policy" "alb_frontend" {
  name    = "${var.project_name}-alb-frontend-origin-request"
  comment = "Forward only the headers needed by the frontend ALB origin."

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"

    headers {
      items = [
        "CloudFront-Forwarded-Proto",
        "Host",
        "Origin",
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

data "aws_cloudfront_cache_policy" "api_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_origin_request_policy" "api" {
  name    = "${var.project_name}-api-origin-request"
  comment = "Forward request context needed by ChargeOps API calls."

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "whitelist"

    headers {
      items = [
        "Authorization",
        "CloudFront-Forwarded-Proto",
        "Content-Type",
        "Host",
        "Origin",
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  comment             = "ChargeOps frontend distribution"
  aliases             = var.enable_custom_domain ? [var.domain_name, var.www_domain_name] : []
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  web_acl_id          = aws_wafv2_web_acl.cloudfront.arn

  origin {
    domain_name = aws_lb.app.dns_name
    origin_id   = "chargeops-alb-origin"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_keepalive_timeout = 5
      origin_protocol_policy   = "http-only"
      origin_read_timeout      = 30
      origin_ssl_protocols     = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id         = "chargeops-alb-origin"
    viewer_protocol_policy   = "redirect-to-https"
    compress                 = true
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id          = aws_cloudfront_cache_policy.frontend_default.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.alb_frontend.id
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "chargeops-alb-origin"
    viewer_protocol_policy   = "redirect-to-https"
    compress                 = true
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.api_disabled.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api.id
  }

  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    target_origin_id       = "chargeops-alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id        = aws_cloudfront_cache_policy.frontend_static.id
  }

  ordered_cache_behavior {
    path_pattern           = "/static/*"
    target_origin_id       = "chargeops-alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id        = aws_cloudfront_cache_policy.frontend_static.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.enable_custom_domain ? [1] : []

    content {
      acm_certificate_arn      = aws_acm_certificate_validation.cloudfront[0].certificate_arn
      minimum_protocol_version = "TLSv1.2_2021"
      ssl_support_method       = "sni-only"
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.enable_custom_domain ? [] : [1]

    content {
      cloudfront_default_certificate = true
    }
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-frontend-cloudfront"
  })

  depends_on = [
    aws_acm_certificate_validation.cloudfront,
    aws_wafv2_web_acl.cloudfront
  ]
}
