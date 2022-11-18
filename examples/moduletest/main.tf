locals {
  tags = merge(var.tags, {
    "ghr:environment" = var.prefix
  })

  github_app_parameters = {
    id         = module.ssm.parameters.github_app_id
    key_base64 = module.ssm.parameters.github_app_key_base64
  }
}

resource "random_string" "random" {
  length  = 24
  special = false
  upper   = false
}

data "aws_iam_policy_document" "deny_unsecure_transport" {
  statement {
    sid = "DenyUnsecureTransport"

    effect = "Deny"

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }

    actions = [
      "sqs:*"
    ]

    resources = [
      "*"
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_sqs_queue_policy" "build_queue_policy" {
  queue_url = aws_sqs_queue.queued_builds.id
  policy    = data.aws_iam_policy_document.deny_unsecure_transport.json
}

resource "aws_sqs_queue" "queued_builds" {
  name                        = "${var.prefix}-queued-builds${var.fifo_build_queue ? ".fifo" : ""}"
  delay_seconds               = var.delay_webhook_event
  visibility_timeout_seconds  = var.runners_scale_up_lambda_timeout
  message_retention_seconds   = var.job_queue_retention_in_seconds
  fifo_queue                  = var.fifo_build_queue
  receive_wait_time_seconds   = 0
  content_based_deduplication = var.fifo_build_queue
  redrive_policy = var.redrive_build_queue.enabled ? jsonencode({
    deadLetterTargetArn = aws_sqs_queue.queued_builds_dlq[0].arn,
    maxReceiveCount     = var.redrive_build_queue.maxReceiveCount
  }) : null

  sqs_managed_sse_enabled           = var.queue_encryption.sqs_managed_sse_enabled
  kms_master_key_id                 = var.queue_encryption.kms_master_key_id
  kms_data_key_reuse_period_seconds = var.queue_encryption.kms_data_key_reuse_period_seconds

  tags = var.tags
}

resource "aws_sqs_queue_policy" "build_queue_dlq_policy" {
  count     = var.redrive_build_queue.enabled ? 1 : 0
  queue_url = aws_sqs_queue.queued_builds.id
  policy    = data.aws_iam_policy_document.deny_unsecure_transport.json
}

resource "aws_sqs_queue" "queued_builds_dlq" {
  count = var.redrive_build_queue.enabled ? 1 : 0
  name  = "${var.prefix}-queued-builds_dead_letter${var.fifo_build_queue ? ".fifo" : ""}"

  sqs_managed_sse_enabled           = var.queue_encryption.sqs_managed_sse_enabled
  kms_master_key_id                 = var.queue_encryption.kms_master_key_id
  kms_data_key_reuse_period_seconds = var.queue_encryption.kms_data_key_reuse_period_seconds
  fifo_queue                        = var.fifo_build_queue
  tags                              = var.tags
}

module "ssm" {
  source = "../../modules/ssm"

  kms_key_arn = var.kms_key_arn
  prefix      = var.prefix
  github_app  = var.github_app
  tags        = local.tags
}

module "webhook" {
  source = "../../modules/webhook"

  aws_region                = var.aws_region
  prefix                    = var.prefix
  tags                      = local.tags
  kms_key_arn               = var.kms_key_arn
  sqs_build_queue           = aws_sqs_queue.queued_builds
  sqs_build_queue_fifo      = var.fifo_build_queue
  github_app_webhook_secret = module.ssm.parameters.github_app_webhook_secret

  webhook_lambda_apigateway_access_log_settings = var.webhook_lambda_apigateway_access_log_settings
  lambda_runtime                                = var.lambda_runtime
  lambda_architecture                           = var.lambda_architecture
  lambda_zip                                    = var.webhook_lambda_zip
  lambda_timeout                                = var.webhook_lambda_timeout
  logging_retention_in_days                     = var.logging_retention_in_days
  logging_kms_key_id                            = var.logging_kms_key_id

  # labels
  #   enable_workflow_job_labels_check = var.runner_enable_workflow_job_labels_check
  #   workflow_job_labels_check_all    = var.runner_enable_workflow_job_labels_check_all
  #  runner_labels                    = var.runner_extra_labels != "" ? "${local.default_runner_labels},${var.runner_extra_labels}" : local.default_runner_labels

  role_path                 = var.role_path
  role_permissions_boundary = var.role_permissions_boundary
  repository_white_list     = var.repository_white_list

  log_level = var.log_level
}

module "runners" {
  source = "../../modules/runner"

  aws_region                = var.aws_region
  vpc_id                    = var.vpc_id
  subnet_ids                = var.subnet_ids
  prefix                    = var.prefix
  tags                      = local.tags
  lambda_runtime            = var.lambda_runtime
  lambda_architecture       = var.lambda_architecture
  lambda_zip                = var.runners_lambda_zip
  lambda_timeout_scale_up   = var.runners_scale_up_lambda_timeout
  lambda_subnet_ids         = var.lambda_subnet_ids
  lambda_security_group_ids = var.lambda_security_group_ids
  logging_retention_in_days = var.logging_retention_in_days
  logging_kms_key_id        = var.logging_kms_key_id

  sqs_build_queue             = aws_sqs_queue.queued_builds
  github_app_parameters       = local.github_app_parameters
  enable_organization_runners = var.enable_organization_runners
  ecs_family_prefix           = var.ecs_family_prefix
  ecs_security_groups         = var.ecs_security_groups
  secret_ttl                  = var.secret_ttl

  #   instance_profile_path     = var.instance_profile_path
  #   role_path                 = var.role_path
  #   role_permissions_boundary = var.role_permissions_boundary

  runner_iam_role_managed_policy_arns = var.runner_iam_role_managed_policy_arns

  #   ghes_url        = var.ghes_url
  #   ghes_ssl_verify = var.ghes_ssl_verify

  kms_key_arn = var.kms_key_arn

  log_level = var.log_level
}