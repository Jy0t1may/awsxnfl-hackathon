# Secure S3 Data Lake for NFL Next Gen Stats Tracking & Scouting Telemetry
resource "aws_s3_bucket" "telemetry_data_lake" {
  bucket_prefix = "${var.telemetry_bucket_prefix}-${var.environment}-"
  force_destroy = false

  tags = {
    Name               = "nfl-nextgen-telemetry-datalake"
    DataClassification = "Restricted-ProtectedIntel"
    ComplianceAudited  = "true"
  }
}

# 1. Block Public Access (Enforced Zero-Trust Ingress Boundary)
resource "aws_s3_bucket_public_access_block" "telemetry_pab" {
  bucket = aws_s3_bucket.telemetry_data_lake.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 2. Server-Side Encryption with Customer Managed Key (SSE-KMS)
resource "aws_s3_bucket_server_side_encryption_configuration" "telemetry_sse" {
  bucket = aws_s3_bucket.telemetry_data_lake.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.telemetry_cmk.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# 3. Object Versioning for Audit Trail & Disaster Recovery
resource "aws_s3_bucket_versioning" "telemetry_versioning" {
  bucket = aws_s3_bucket.telemetry_data_lake.id
  versioning_configuration {
    status = "Enabled"
  }
}

# 4. Enforce Strict TLS (HTTPS) In-Transit Transport Policy
resource "aws_s3_bucket_policy" "telemetry_tls_policy" {
  bucket = aws_s3_bucket.telemetry_data_lake.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLSRequestsOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.telemetry_data_lake.arn,
          "${aws_s3_bucket.telemetry_data_lake.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "EnforceMinimumTLSVersion"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.telemetry_data_lake.arn,
          "${aws_s3_bucket.telemetry_data_lake.arn}/*"
        ]
        Condition = {
          NumericLessThan = {
            "s3:TlsVersion" = 1.2
          }
        }
      }
    ]
  })
}

# 5. Lifecycle Policy for Historical 10Hz Tracking Frames
resource "aws_s3_bucket_lifecycle_configuration" "telemetry_lifecycle" {
  bucket = aws_s3_bucket.telemetry_data_lake.id

  rule {
    id     = "archive-historical-tracking-frames"
    status = "Enabled"

    filter {
      prefix = "tracking/raw/"
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}
