# AWS WAF v2 Web ACL Protecting NFL Telemetry API
# Mitigates Rate-Based Exfiltration, SQL/DuckDB Injection, and Automated Scraping

resource "aws_wafv2_web_acl" "telemetry_waf" {
  name        = "${var.project_name}-Telemetry-Protection-WAF"
  description = "WAF protecting GridironLens Next Gen Stats API against DDoS, SQLi, and scraping"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule 1: Rate Limiting to prevent scraping of high-frequency 10Hz tracking sequences
  rule {
    name     = "RateLimitPerIP"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GridironLensRateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed Common Rule Set (Core Protection against XSS, Local File Inclusion)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GridironLensCommonRules"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: AWS Managed SQLi Rule Set (Blocks SQL & DuckDB injection in query parameters)
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GridironLensSQLiProtection"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Block Suspicious Automated Scrapers / Crawlers
  rule {
    name     = "BlockSuspiciousScrapers"
    priority = 40

    action {
      block {}
    }

    statement {
      byte_match_statement {
        field_to_match {
          single_header {
            name = "user-agent"
          }
        }
        positional_constraint = "CONTAINS"
        search_string         = "sqlmap"
        text_transformation {
          priority = 0
          type     = "LOWERCASE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GridironLensBlockedScrapers"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "GridironLensWAFSummary"
    sampled_requests_enabled   = true
  }

  tags = {
    SecurityLayer = "EdgePerimeter"
    Compliance    = "OWASP-Top10"
  }
}
