output "kms_cmk_arn" {
  description = "Customer Managed Key (CMK) ARN for telemetry encryption"
  value       = aws_kms_key.telemetry_cmk.arn
}

output "kms_cmk_alias" {
  description = "Alias of the telemetry encryption key"
  value       = aws_kms_alias.telemetry_cmk_alias.name
}

output "s3_telemetry_bucket_name" {
  description = "Encrypted S3 Data Lake bucket name"
  value       = aws_s3_bucket.telemetry_data_lake.id
}

output "s3_telemetry_bucket_arn" {
  description = "Encrypted S3 Data Lake bucket ARN"
  value       = aws_s3_bucket.telemetry_data_lake.arn
}

output "waf_web_acl_arn" {
  description = "AWS WAF v2 WebACL ARN protecting the telemetry API"
  value       = aws_wafv2_web_acl.telemetry_waf.arn
}

output "coach_role_arn" {
  description = "IAM Role ARN for Coaching analytics"
  value       = aws_iam_role.coach_role.arn
}

output "scout_role_arn" {
  description = "IAM Role ARN for Scout / Recruiter analytics"
  value       = aws_iam_role.scout_role.arn
}

output "ingestion_role_arn" {
  description = "IAM Role ARN for Zebra RFID tracking ingestion"
  value       = aws_iam_role.ingestion_role.arn
}

output "cloudtrail_arn" {
  description = "CloudTrail Audit Trail ARN"
  value       = aws_cloudtrail.nfl_telemetry_audit_trail.arn
}
