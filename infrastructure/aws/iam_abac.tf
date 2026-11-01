# Zero-Trust Attribute-Based Access Control (ABAC) Roles and Policies
# Enforcing Strict Separation of Duties between Coaching Schemes, Scouting Intel, and Stadium Ingestion

# 1. Ingestion Role (Stadium RFID Sensors / Zebra Technologies)
resource "aws_iam_role" "ingestion_role" {
  name        = "${var.project_name}-RFID-TelemetryIngestion-Role"
  description = "Role for real-time 10Hz RFID tracking telemetry ingestion from stadium sensors"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = ["lambda.amazonaws.com", "ec2.amazonaws.com"]
        }
      }
    ]
  })

  tags = {
    Department      = "StadiumOperations"
    AccessClearance = "IngestOnly"
    RoleType        = "TelemetryProducer"
  }
}

# 2. Coach Role (Offensive/Defensive Schemes, EPA Matrix, Alignment)
resource "aws_iam_role" "coach_role" {
  name        = "${var.project_name}-Coach-Analytics-Role"
  description = "Role for NFL Coaching staff inspecting scheme, formations, and EPA outcomes"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Department      = "Coaching"
    AccessClearance = "PlaybookSchemes"
    RoleType        = "TacticalConsumer"
  }
}

# 3. Scout / Recruiter Role (PFR Combine Measurables, Seasonal Production)
resource "aws_iam_role" "scout_role" {
  name        = "${var.project_name}-Scout-Recruiter-Role"
  description = "Role for NFL Scouting & Front Office inspecting Combine measurables and prospect speed"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Department      = "Scouting"
    AccessClearance = "ScoutingIntel"
    RoleType        = "EvaluationConsumer"
  }
}

# ABAC Policy for Coach: Can read game schemes, plays, and tracking coordinates; DENIED athlete biometric notes & contract intel
resource "aws_iam_policy" "coach_abac_policy" {
  name        = "${var.project_name}-Coach-ABAC-Policy"
  description = "Enforces Zero-Trust boundary for coaching staff"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCoachingTelemetryAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.telemetry_data_lake.arn,
          "${aws_s3_bucket.telemetry_data_lake.arn}/schemes/*",
          "${aws_s3_bucket.telemetry_data_lake.arn}/tracking/*"
        ]
      },
      {
        Sid    = "DenyAccessToScoutingEvaluationsAndBiometrics"
        Effect = "Deny"
        Action = "s3:GetObject"
        Resource = [
          "${aws_s3_bucket.telemetry_data_lake.arn}/scouting/*",
          "${aws_s3_bucket.telemetry_data_lake.arn}/athlete-biometrics/*"
        ]
      }
    ]
  })
}

# ABAC Policy for Scout: Can read player profiles, Combine percentiles, and 40-yard dash tracking; DENIED confidential game plan tactical schemes
resource "aws_iam_policy" "scout_abac_policy" {
  name        = "${var.project_name}-Scout-ABAC-Policy"
  description = "Enforces Zero-Trust boundary for scouting personnel"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowScoutingAndCombineAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.telemetry_data_lake.arn,
          "${aws_s3_bucket.telemetry_data_lake.arn}/scouting/*",
          "${aws_s3_bucket.telemetry_data_lake.arn}/players/*"
        ]
      },
      {
        Sid    = "DenyAccessToProprietaryPlaybookSchemes"
        Effect = "Deny"
        Action = "s3:GetObject"
        Resource = [
          "${aws_s3_bucket.telemetry_data_lake.arn}/schemes/confidential-playbooks/*"
        ]
      }
    ]
  })
}

# Attach policies to respective roles
resource "aws_iam_role_policy_attachment" "coach_attach" {
  role       = aws_iam_role.coach_role.name
  policy_arn = aws_iam_policy.coach_abac_policy.arn
}

resource "aws_iam_role_policy_attachment" "scout_attach" {
  role       = aws_iam_role.scout_role.name
  policy_arn = aws_iam_policy.scout_abac_policy.arn
}
