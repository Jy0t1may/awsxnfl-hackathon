# AWS CloudTrail & CloudWatch Security Monitoring for NFL Tracking Telemetry
# Provides Tamper-Proof Audit Logging & Anomaly Detection for Data Exfiltration

# S3 Bucket for CloudTrail Logs
resource "aws_s3_bucket" "audit_trail_bucket" {
  bucket_prefix = "gridironlens-cloudtrail-audit-"
  force_destroy = false

  tags = {
    Name               = "gridironlens-audit-logs"
    DataClassification = "AuditRecords"
  }
}

resource "aws_s3_bucket_public_access_block" "audit_pab" {
  bucket = aws_s3_bucket.audit_trail_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "audit_trail_bucket_policy" {
  bucket = aws_s3_bucket.audit_trail_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.audit_trail_bucket.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.audit_trail_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# CloudTrail Trail capturing Telemetry S3 Data Events & KMS Cryptographic Operations
resource "aws_cloudtrail" "nfl_telemetry_audit_trail" {
  name                          = "${var.project_name}-Telemetry-AuditTrail"
  s3_bucket_name                = aws_s3_bucket.audit_trail_bucket.id
  include_global_service_events = false
  is_multi_region_trail         = false
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.telemetry_cmk.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.telemetry_data_lake.arn}/"]
    }
  }

  depends_on = [aws_s3_bucket_policy.audit_trail_bucket_policy]

  tags = {
    Name       = "nfl-telemetry-cloudtrail"
    AuditScope = "KMS-and-S3-DataEvents"
  }
}

# CloudWatch Log Group for Real-Time Security Monitoring
resource "aws_cloudwatch_log_group" "telemetry_security_logs" {
  name              = "/aws/gridironlens/telemetry-security-events"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.telemetry_cmk.arn

  tags = {
    Environment = var.environment
  }
}

# Metric Filter to Detect Anomaly / Mass Download of Prospect Combine Intel
resource "aws_cloudwatch_log_metric_filter" "bulk_scouting_access" {
  name           = "BulkScoutingAccessExfiltration"
  pattern        = "{ ($.eventName = \"GetObject\") && ($.requestParameters.key = \"scouting/*\") }"
  log_group_name = aws_cloudwatch_log_group.telemetry_security_logs.name

  metric_transformation {
    name      = "ScoutingAccessRate"
    namespace = "GridironLens/SecurityMetrics"
    value     = "1"
  }
}

# Metric Alarm triggering when anomalous bulk access occurs
resource "aws_cloudwatch_metric_alarm" "exfiltration_alert" {
  alarm_name          = "HighFrequencyScoutingIntelAccessAlert"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ScoutingAccessRate"
  namespace           = "GridironLens/SecurityMetrics"
  period              = 300
  statistic           = "Sum"
  threshold           = 250
  alarm_description   = "Triggers when anomalous rate of prospect scouting intel is downloaded within 5 minutes"

  tags = {
    Severity = "HIGH"
    Team     = "SecOps"
  }
}
