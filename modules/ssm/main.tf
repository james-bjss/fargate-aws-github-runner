resource "aws_ssm_parameter" "github_app_id" {
  count  = var.github_app.id == null ? 0 : 1
  name   = "/actions_runner/${var.prefix}/github_app_id"
  type   = "SecureString"
  value  = var.github_app.id
  key_id = local.kms_key_arn
  tags   = var.tags
}

resource "aws_ssm_parameter" "github_app_id_ignore_changes" {
  count  = var.github_app.id == null ? 1 : 0
  name   = "/actions_runner/${var.prefix}/github_app_id"
  type   = "SecureString"
  value  = local.default_value
  key_id = local.kms_key_arn
  tags   = var.tags

  lifecycle {
    ignore_changes = [
      value,
    ]
  }
}

resource "aws_ssm_parameter" "github_app_key_base64" {
  count  = var.github_app.key_base64 == null ? 0 : 1
  name   = "/actions_runner/${var.prefix}/github_app_key_base64"
  type   = "SecureString"
  value  = var.github_app.key_base64
  key_id = local.kms_key_arn
  tags   = var.tags
}

resource "aws_ssm_parameter" "github_app_key_base64_ignore_changes" {
  count  = var.github_app.key_base64 == null ? 1 : 0
  name   = "/actions_runner/${var.prefix}/github_app_key_base64"
  type   = "SecureString"
  value  = local.default_value
  key_id = local.kms_key_arn
  tags   = var.tags

  lifecycle {
    ignore_changes = [
      value,
    ]
  }
}

resource "aws_ssm_parameter" "github_app_webhook_secret" {
  count  = var.github_app.webhook_secret == null ? 0 : 1
  name   = "/actions_runner/${var.prefix}/github_app_webhook_secret"
  type   = "SecureString"
  value  = var.github_app.webhook_secret
  key_id = local.kms_key_arn
  tags   = var.tags
}

resource "aws_ssm_parameter" "github_app_webhook_secret_ignore_changes" {
  count  = var.github_app.webhook_secret == null ? 1 : 0
  name   = "/actions_runner/${var.prefix}/github_app_webhook_secret"
  type   = "SecureString"
  value  = local.default_value
  key_id = local.kms_key_arn
  tags   = var.tags

  lifecycle {
    ignore_changes = [
      value,
    ]
  }
}