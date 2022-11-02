locals {
  webhookpath      = "../../lambda/webhook/dist/webhook.zip"
  webhook_endpoint = "webhook"
}

resource "aws_lambda_function" "webhook" {
  description   = "Webhook for GH Runner"
  function_name = "gh_webhook"

  filename = local.webhookpath
  role     = aws_iam_role.webhook_role.arn
  handler  = "index.handler"
  runtime  = "nodejs16.x"
  publish  = true

  source_code_hash = filebase64sha256(local.webhookpath)

  environment {
    variables = {
      SECRET_TTL  = "30"
      SECRET_PATH = "/gh_action/webhook_secret"
      SQS_URL     = aws_sqs_queue.webhook_events_workflow_job_queue.url
    }
  }
}

resource "aws_cloudwatch_log_group" "webhook" {
  name              = "/aws/lambda/${aws_lambda_function.webhook.function_name}"
  retention_in_days = 1
}

resource "aws_lambda_permission" "webhook" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.webhook.execution_arn}/*/*/${local.webhook_endpoint}"
}

resource "aws_iam_role" "webhook_role" {
  name = "iam_for_lambda"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "webhook_logging" {
  name = "webhook-lambda-logging-policy" // naming
  role = aws_iam_role.webhook_role.name
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : ["logs:CreateLogStream", "logs:PutLogEvents"],
        "Resource" : "${aws_cloudwatch_log_group.webhook.arn}*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "webhook_ssm" {
  name = "webhook-lambda-ssm-policy" // naming
  role = aws_iam_role.webhook_role.name
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : [
          "ssm:GetParameter"
        ],
        "Resource" : [aws_ssm_parameter.secret.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "webhook_sqs" {
  name = "webhook-lambda-sqs-policy" // naming
  role = aws_iam_role.webhook_role.name
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : ["sqs:SendMessage", "sqs:GetQueueAttributes"],
        "Resource" : aws_sqs_queue.webhook_events_workflow_job_queue.arn
      }
    ]
  })
}

resource "aws_apigatewayv2_api" "webhook" {
  name          = "github-action-webhook" //prefix
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_route" "webhook" {
  api_id    = aws_apigatewayv2_api.webhook.id
  route_key = "POST /${local.webhook_endpoint}"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

resource "aws_apigatewayv2_stage" "webhook" {
  lifecycle {
    ignore_changes = [
      default_route_settings,
      deployment_id
    ]
  }

  api_id      = aws_apigatewayv2_api.webhook.id
  name        = "$default"
  auto_deploy = true
  #   dynamic "access_log_settings" {
  #     for_each = var.webhook_lambda_apigateway_access_log_settings[*]
  #     content {
  #       destination_arn = access_log_settings.value.destination_arn
  #       format          = access_log_settings.value.format
  #     }
  #   }
}

resource "aws_apigatewayv2_integration" "webhook" {
  lifecycle {
    ignore_changes = [
      // not terraform managed
      passthrough_behavior
    ]
  }

  api_id           = aws_apigatewayv2_api.webhook.id
  integration_type = "AWS_PROXY"

  connection_type    = "INTERNET"
  description        = "GitHub App webhook for receiving build events."
  integration_method = "POST"
  integration_uri    = aws_lambda_function.webhook.invoke_arn
}

