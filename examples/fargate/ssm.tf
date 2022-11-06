resource "aws_ssm_parameter" "webhook_secret" {
  name        = "/gh_action/webhook_secret"
  description = "Webhook Secret"
  type        = "SecureString"
  value       = "blah"
}

resource "aws_ssm_parameter" "github_app_cert" {
  name        = "/gh_action/github_app_key_base64"
  description = "Webhook Secret"
  type        = "SecureString"
  value       = "dummy"

  lifecycle {
    ignore_changes = [value]
  }
}