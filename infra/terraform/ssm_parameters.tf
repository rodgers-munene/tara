resource "aws_ssm_parameter" "app_secrets" {
  for_each = toset(var.app_secret_keys)

  name  = "/${var.project_name}/${each.value}"
  type  = "SecureString"
  value = var.app_secrets[each.value]


  tags = {
    Name = "${var.project_name}-${each.key}"
  }
}

data "aws_caller_identity" "current" {}

data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}

resource "aws_iam_role_policy" "ssm_read_params" {
  name = "${var.project_name}-ssm-read-params"
  role = aws_iam_role.ec2_ssm.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = data.aws_kms_alias.ssm.target_key_arn
      }
    ]
  })
}
