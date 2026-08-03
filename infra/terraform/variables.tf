variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Short name used to prefix/tag all resources"
  type        = string
  default     = "tara"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet (EC2)"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the private subnets (RDS), one per AZ"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "db_password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true
}

variable "app_secrets" {
  description = "Backend application secrets, pushed to SSM Parameter Store"
  type        = map(string)
  sensitive   = true
}

variable "app_secret_keys" {
  description = "Names of app secrets (keys into app_secrets) - not sensitive themselves"
  type        = list(string)
  default = [
    "DATABASE_URL",
    "PAYSTACK_SECRET_KEY",
    "PAYSTACK_PUBLIC_KEY",
    "FRONTEND_URL",
    "JWT_SECRET",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "CRON_SECRET",
    "AGENT_API_SECRET",
  ]
}

