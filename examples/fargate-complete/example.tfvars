aws_region         = "us-east-1"
github_app         = { id : null, key_base64 : null, webhook_secret : null }
webhook_lambda_zip = "../../lambda/webhook/dist/webhook.zip"
runners_lambda_zip = "../../lambda/runner/dist/runner.zip"
fifo_build_queue   = true
ecs_family_prefix  = "gh_"
secret_ttl         = "30"