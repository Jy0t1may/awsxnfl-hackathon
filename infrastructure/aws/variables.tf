variable "aws_region" {
  type        = string
  description = "AWS deployment region for NFL analytics infrastructure"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g. production, staging, sandbox)"
  default     = "production"
}

variable "project_name" {
  type        = string
  description = "Project identifier"
  default     = "GridironLens"
}

variable "telemetry_bucket_prefix" {
  type        = string
  description = "Prefix for S3 Telemetry Data Lake bucket"
  default     = "gridironlens-nfl-telemetry"
}
