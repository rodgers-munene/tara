output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "ec2_public_ip" {
  value = aws_eip.main.public_ip
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions_deploy.arn
}
