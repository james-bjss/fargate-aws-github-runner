resource "aws_lambda_function" "webhook" {
  description      = "Webhook for GH Runner"
  function_name    = "${var.prefix}-webhook"
  source_code_hash = filebase64sha256(local.lambda_zip)

  filename      = local.lambda_zip
  role          = aws_iam_role.webhook_lambda.arn
  handler       = "index.handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  architectures = [var.lambda_architecture]


  environment {
    variables = {
      LOG_LEVEL   = var.log_level
      ENVIRONMENT = var.prefix
      SECRET_TTL  = "30"
      SECRET_PATH = var.github_app_webhook_secret.name
      SQS_URL     = var.sqs_build_queue.id
    }
  }

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "webhook" {
  name              = "/aws/lambda/${aws_lambda_function.webhook.function_name}"
  retention_in_days = var.logging_retention_in_days
  kms_key_id        = var.logging_kms_key_id
  tags              = var.tags
}

resource "aws_lambda_permission" "webhook" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.webhook.execution_arn}/*/*/${local.webhook_endpoint}"
}

data "aws_iam_policy_document" "lambda_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "webhook_lambda" {
  name                 = "${var.prefix}-action-webhook-lambda-role"
  assume_role_policy   = data.aws_iam_policy_document.lambda_assume_role_policy.json
  path                 = local.role_path
  permissions_boundary = var.role_permissions_boundary
  tags                 = var.tags
}

resource "aws_iam_role_policy" "webhook_logging" {
  name = "${var.prefix}-lambda-logging-policy"
  role = aws_iam_role.webhook_lambda.name
  policy = templatefile("${path.module}/policies/lambda-cloudwatch.json", {
    log_group_arn = aws_cloudwatch_log_group.webhook.arn
  })
}

resource "aws_iam_role_policy" "webhook_sqs" {
  name = "${var.prefix}-lambda-webhook-publish-sqs-policy"
  role = aws_iam_role.webhook_lambda.name

  policy = templatefile("${path.module}/policies/lambda-publish-sqs-policy.json", {
    sqs_resource_arn = var.sqs_build_queue.arn
  })
}

resource "aws_iam_role_policy" "webhook_ssm" {
  name = "${var.prefix}-lambda-webhook-publish-ssm-policy"
  role = aws_iam_role.webhook_lambda.name

  policy = templatefile("${path.module}/policies/lambda-ssm.json", {
    github_app_webhook_secret_arn = var.github_app_webhook_secret.arn,
    kms_key_arn                   = var.kms_key_arn != null ? var.kms_key_arn : ""
  })
}