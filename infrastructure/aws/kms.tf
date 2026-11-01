data "aws_caller_identity" "current" {}

# Customer Managed Key (CMK) for NFL Tracking Telemetry & Athlete Biometrics
resource "aws_kms_key" "telemetry_cmk" {
  description             = "KMS CMK for NFL Next Gen Stats 10Hz Tracking, Athlete Biometrics & PFR Scouting Data"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "NFLTelemetryKeyPolicy"
    Statement = [
      {
        Sid    = "EnableIAMUserPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowTelemetryIngestionEncryption"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ingestion_role.arn
        }
        Action = [
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "s3.${var.aws_region}.amazonaws.com"
          }
        }
      },
      {
        Sid    = "AllowCoachAndScoutDecryptionUnderABAC"
        Effect = "Allow"
        Principal = {
          AWS = [
            aws_iam_role.coach_role.arn,
            aws_iam_role.scout_role.arn
          ]
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "s3.${var.aws_region}.amazonaws.com"
          }
        }
      },
      {
        Sid    = "AllowCloudWatchLogsKMSUsage"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name                = "nfl-nextgen-telemetry-cmk"
    DataClassification  = "Restricted-Biometric-Intel"
    ComplianceFramework = "ZeroTrust-NIST800-207"
  }
}

resource "aws_kms_alias" "telemetry_cmk_alias" {
  name          = "alias/nfl-nextgen-telemetry-cmk"
  target_key_id = aws_kms_key.telemetry_cmk.key_id
}
