aws_region         = "us-east-1"
github_app         = { id : "223", key_base64 : "ssds", webhook_secret : "blah" }
webhook_lambda_zip = "../../lambda/webhook/dist/webhook.zip"
runners_lambda_zip = "../../lambda/runner/dist/runner.zip"
fifo_build_queue   = true
ecs_family_prefix  = "gh_"
secret_ttl         = "30"