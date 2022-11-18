locals {
  role_path   = var.role_path == null ? "/${var.prefix}/" : var.role_path
  lambda_zip  = var.lambda_zip
  kms_key_arn = var.kms_key_arn != null ? var.kms_key_arn : ""

  tags = merge(
    {
      "Name" = format("%s-action-runner", var.prefix)
    },
    var.tags,
  )
}

resource "aws_lambda_function" "runner" {
  filename                       = local.lambda_zip
  source_code_hash               = filebase64sha256(local.lambda_zip)
  function_name                  = "${var.prefix}-runner"
  role                           = aws_iam_role.runner.arn
  handler                        = "index.handler"
  runtime                        = var.lambda_runtime
  timeout                        = var.lambda_timeout_scale_up
  reserved_concurrent_executions = var.scale_up_reserved_concurrent_executions
  memory_size                    = 256
  tags                           = local.tags
  architectures                  = [var.lambda_architecture]

  environment {
    variables = {
      // ECS Config
      ECS_FAMILY_PREFIX   = var.ecs_family_prefix
      ECS_SUBNETS         = join(",",var.subnet_ids)
      ECS_SECURITY_GROUPS = join(",",var.ecs_security_groups)
      SECRET_TTL          = var.secret_ttl
      GH_RUNNER_KEY_PATH  = var.github_app_parameters.key_base64.name


      USE_ORG_RUNNERS = var.enable_organization_runners
      ENVIRONMENT     = var.prefix
      GHES_URL        = var.ghes_url
      LOG_LEVEL       = var.log_level
      GH_APP_ID       = var.github_app_parameters.id.name
      GH_APP_KEY_PATH = var.github_app_parameters.key_base64.name
      // Maybe implement? RUNNER_GROUP_NAME                    = var.runner_group_name
      // Maybe implement? RUNNERS_MAXIMUM_COUNT                = var.runners_maximum_count
      // Good idea NODE_TLS_REJECT_UNAUTHORIZED         = var.ghes_url != null && !var.ghes_ssl_verify ? 0 : 1
      SUBNET_IDS = join(",", var.subnet_ids)
    }
  }

  dynamic "vpc_config" {
    for_each = var.lambda_subnet_ids != null && var.lambda_security_group_ids != null ? [true] : []
    content {
      security_group_ids = var.lambda_security_group_ids
      subnet_ids         = var.lambda_subnet_ids
    }
  }
}

resource "aws_cloudwatch_log_group" "runner" {
  name              = "/aws/lambda/${aws_lambda_function.runner.function_name}"
  retention_in_days = var.logging_retention_in_days
  kms_key_id        = var.logging_kms_key_id
  tags              = var.tags
}

resource "aws_lambda_event_source_mapping" "runner" {
  event_source_arn = var.sqs_build_queue.arn
  function_name    = aws_lambda_function.runner.arn
  batch_size       = 1
}

resource "aws_lambda_permission" "runner" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.runner.function_name
  principal     = "sqs.amazonaws.com"
  source_arn    = var.sqs_build_queue.arn
}

resource "aws_iam_role" "runner" {
  name                 = "${var.prefix}-action-runner-lambda-role"
  assume_role_policy   = data.aws_iam_policy_document.lambda_assume_role_policy.json
  path                 = local.role_path
  permissions_boundary = var.role_permissions_boundary
  tags                 = local.tags
}

resource "aws_iam_role_policy" "runner" {
  name = "${var.prefix}-lambda-runner-policy"
  role = aws_iam_role.runner.name
  policy = templatefile("${path.module}/policies/lambda-scale-up.json", {
    arn_runner_instance_role  = aws_iam_role.runner.arn
    sqs_arn                   = var.sqs_build_queue.arn
    github_app_id_arn         = var.github_app_parameters.id.arn
    github_app_key_base64_arn = var.github_app_parameters.key_base64.arn
    kms_key_arn               = local.kms_key_arn
  })
}


resource "aws_iam_role_policy" "runner_logging" {
  name = "${var.prefix}-lambda-logging"
  role = aws_iam_role.runner.name
  policy = templatefile("${path.module}/policies/lambda-cloudwatch.json", {
    log_group_arn = aws_cloudwatch_log_group.runner.arn
  })
}

resource "aws_iam_role_policy_attachment" "scale_up_vpc_execution_role" {
  count      = length(var.lambda_subnet_ids) > 0 ? 1 : 0
  role       = aws_iam_role.runner.name
  policy_arn = "arn:${var.aws_partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}