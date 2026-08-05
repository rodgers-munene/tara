data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}


resource "aws_iam_role" "github_actions_deploy" {
  name = "${var.project_name}-github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = data.aws_iam_openid_connect_provider.github.arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:rodgers-munene/tara:ref:refs/heads/main"
        }
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-github-actions-deploy"
  }
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "${var.project_name}-github-actions-deploy"
  role = aws_iam_role.github_actions_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "ssm:SendCommand"
        Resource = [
          aws_instance.main.arn,
          "arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript"
        ]
      },
      {
        Effect   = "Allow"
        Action   = "ssm:GetCommandInvocation"
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
      }
    ]
  })
}