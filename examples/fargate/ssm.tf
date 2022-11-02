resource "aws_ssm_parameter" "secret" {
  name        = "/gh_action/webhook_secret"
  description = "Webhook Secret"
  type        = "SecureString"
  value       = "blah"
}