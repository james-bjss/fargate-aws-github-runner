output "parameters" {
  value = {
    github_app_id = {
      name = try(aws_ssm_parameter.github_app_id[0].name, aws_ssm_parameter.github_app_id_ignore_changes[0].name)
      arn  = try(aws_ssm_parameter.github_app_id[0].arn, aws_ssm_parameter.github_app_id_ignore_changes[0].arn)
    }
    github_app_key_base64 = {
      name = try(aws_ssm_parameter.github_app_key_base64[0].name, aws_ssm_parameter.github_app_key_base64_ignore_changes[0].name)
      arn  = try(aws_ssm_parameter.github_app_key_base64[0].arn, aws_ssm_parameter.github_app_key_base64_ignore_changes[0].arn)
    }
    github_app_webhook_secret = {
      name = try(aws_ssm_parameter.github_app_webhook_secret[0].name, aws_ssm_parameter.github_app_webhook_secret_ignore_changes[0].name)
      arn  = try(aws_ssm_parameter.github_app_webhook_secret[0].arn, aws_ssm_parameter.github_app_webhook_secret_ignore_changes[0].arn)
    }
  }
}