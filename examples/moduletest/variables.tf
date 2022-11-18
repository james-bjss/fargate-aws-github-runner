variable "aws_region" {
  description = "AWS region."
  type        = string
}

variable "vpc_id" {
  description = "The VPC for security groups of the action runners."
  type        = string
}

variable "subnet_ids" {
  description = "List of subnets in which the action runners will be launched, the subnets needs to be subnets in the `vpc_id`."
  type        = list(string)
}

variable "tags" {
  description = "Map of tags that will be added to created resources. By default resources will be tagged with name and environment."
  type        = map(string)
  default     = {}
}

variable "prefix" {
  description = "The prefix used for naming resources"
  type        = string
  default     = "github-actions"
}

variable "enable_organization_runners" {
  description = "Register runners to organization, instead of repo level"
  type        = bool
  default     = false
}

variable "github_app" {
  description = "GitHub app parameters, see your github app. Ensure the key is the base64-encoded `.pem` file (the output of `base64 app.private-key.pem`, not the content of `private-key.pem`)."
  type = object({
    key_base64     = string
    id             = string
    webhook_secret = string
  })
}

variable "runner_group_name" {
  description = "Name of the runner group."
  type        = string
  default     = "Default"
}

variable "scale_up_reserved_concurrent_executions" {
  description = "Amount of reserved concurrent executions for the scale-up lambda function. A value of 0 disables lambda from being triggered and -1 removes any concurrency limitations."
  type        = number
  default     = 1
}

variable "webhook_lambda_zip" {
  description = "File location of the webhook lambda zip file."
  type        = string
}

variable "webhook_lambda_timeout" {
  description = "Timeout of the webhook lambda in seconds."
  type        = number
  default     = 10
}

variable "runners_scale_up_lambda_timeout" {
  description = "Time out for the scale up lambda in seconds."
  type        = number
  default     = 30
}

variable "runners_lambda_zip" {
  description = "File location of the lambda zip file for scaling runners."
  type        = string
}

variable "role_permissions_boundary" {
  description = "Permissions boundary that will be added to the created roles."
  type        = string
  default     = null
}

variable "role_path" {
  description = "The path that will be added to role path for created roles, if not set the environment name will be used."
  type        = string
  default     = null
}

variable "kms_key_arn" {
  description = "Optional CMK Key ARN to be used for Parameter Store. This key must be in the current account."
  type        = string
  default     = null
}

variable "logging_retention_in_days" {
  description = "Specifies the number of days you want to retain log events for the lambda log group. Possible values are: 0, 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, and 3653."
  type        = number
  default     = 180
}

variable "logging_kms_key_id" {
  description = "Specifies the kms key id to encrypt the logs with"
  type        = string
  default     = null
}

variable "runner_allow_prerelease_binaries" {
  description = "(Deprecated, no longer used), allow the runners to update to prerelease binaries."
  type        = bool
  default     = null

  validation {
    condition     = var.runner_allow_prerelease_binaries == null
    error_message = "The \"runner_allow_prerelease_binaries\" variable is no longer used. GitHub runners are not released as pre-release, only releases should be used."
  }
}

variable "webhook_lambda_apigateway_access_log_settings" {
  type = object({
    destination_arn = string
    format          = string
  })
  default = null
}

variable "runner_iam_role_managed_policy_arns" {
  description = "Attach AWS or customer-managed IAM policies (by ARN) to the runner IAM role"
  type        = list(string)
  default     = []
}

variable "cloudwatch_config" {
  description = "(optional) Replaces the module default cloudwatch log config. See https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html for details."
  type        = string
  default     = null
}

variable "runner_log_files" {
  description = "(optional) Replaces the module default cloudwatch log config. See https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html for details."
  type = list(object({
    log_group_name   = string
    prefix_log_group = bool
    file_path        = string
    log_stream_name  = string
  }))
  default = null
}

variable "lambda_subnet_ids" {
  description = "List of subnets in which the action runners will be launched, the subnets needs to be subnets in the `vpc_id`."
  type        = list(string)
  default     = []
}

variable "lambda_security_group_ids" {
  description = "List of security group IDs associated with the Lambda function."
  type        = list(string)
  default     = []
}

variable "key_name" {
  description = "Key pair name"
  type        = string
  default     = null
}

variable "instance_type" {
  description = "[DEPRECATED] See instance_types."
  type        = string
  default     = null

  validation {
    condition     = anytrue([var.instance_type == null])
    error_message = "Deprecated, replaced by `instance_types`."
  }
}

variable "instance_types" {
  description = "List of instance types for the action runner. Defaults are based on runner_os (amzn2 for linux and Windows Server Core for win)."
  type        = list(string)
  default     = ["m5.large", "c5.large"]
}

variable "repository_white_list" {
  description = "List of repositories allowed to use the github app"
  type        = list(string)
  default     = []
}

variable "delay_webhook_event" {
  description = "The number of seconds the event accepted by the webhook is invisible on the queue before the scale up lambda will receive the event."
  type        = number
  default     = 30
}
variable "job_queue_retention_in_seconds" {
  description = "The number of seconds the job is held in the queue before it is purged"
  type        = number
  default     = 86400
}

variable "log_level" {
  description = "Logging level for lambda logging. Valid values are  'trace', 'debug', 'info', 'warn', 'error'."
  type        = string
  default     = "info"
  validation {
    condition = anytrue([
      var.log_level == "trace",
      var.log_level == "debug",
      var.log_level == "info",
      var.log_level == "warn",
      var.log_level == "error",
    ])
    error_message = "`log_level` value not valid. Valid values are 'trace', 'debug', 'info', 'warn', 'error'."
  }
}

variable "lambda_principals" {
  description = "(Optional) add extra principals to the role created for execution of the lambda, e.g. for local testing."
  type = list(object({
    type        = string
    identifiers = list(string)
  }))
  default = []
}

variable "fifo_build_queue" {
  description = "Enable a FIFO queue to remain the order of events received by the webhook. Suggest to set to true for repo level runners."
  type        = bool
  default     = false
}

variable "redrive_build_queue" {
  description = "Set options to attach (optional) a dead letter queue to the build queue, the queue between the webhook and the scale up lambda. You have the following options. 1. Disable by setting `enabled` to false. 2. Enable by setting `enabled` to `true`, `maxReceiveCount` to a number of max retries."
  type = object({
    enabled         = bool
    maxReceiveCount = number
  })
  default = {
    enabled         = false
    maxReceiveCount = null
  }
  validation {
    condition     = var.redrive_build_queue.enabled && var.redrive_build_queue.maxReceiveCount != null || !var.redrive_build_queue.enabled
    error_message = "Ensure you have set the maxReceiveCount when enabled."
  }
}

variable "pool_lambda_timeout" {
  description = "Time out for the pool lambda in seconds."
  type        = number
  default     = 60
}

variable "pool_runner_owner" {
  description = "The pool will deploy runners to the GitHub org ID, set this value to the org to which you want the runners deployed. Repo level is not supported."
  type        = string
  default     = null
}

variable "pool_lambda_reserved_concurrent_executions" {
  description = "Amount of reserved concurrent executions for the scale-up lambda function. A value of 0 disables lambda from being triggered and -1 removes any concurrency limitations."
  type        = number
  default     = 1
}

variable "aws_partition" {
  description = "(optiona) partition in the arn namespace to use if not 'aws'"
  type        = string
  default     = "aws"
}

variable "disable_runner_autoupdate" {
  description = "Disable the auto update of the github runner agent. Be-aware there is a grace period of 30 days, see also the [GitHub article](https://github.blog/changelog/2022-02-01-github-actions-self-hosted-runners-can-now-disable-automatic-updates/)"
  type        = bool
  default     = true
}

variable "lambda_runtime" {
  description = "AWS Lambda runtime."
  type        = string
  default     = "nodejs16.x"
}

variable "lambda_architecture" {
  description = "AWS Lambda architecture. Lambda functions using Graviton processors ('arm64') tend to have better price/performance than 'x86_64' functions. "
  type        = string
  default     = "x86_64"
  validation {
    condition     = contains(["arm64", "x86_64"], var.lambda_architecture)
    error_message = "`lambda_architecture` value is not valid, valid values are: `arm64` and `x86_64`."
  }
}

variable "enable_workflow_job_events_queue" {
  description = "Enabling this experimental feature will create a secondory sqs queue to wich a copy of the workflow_job event will be delivered."
  type        = bool
  default     = false
}

variable "workflow_job_queue_configuration" {
  description = "Configuration options for workflow job queue which is only applicable if the flag enable_workflow_job_events_queue is set to true."
  type = object({
    delay_seconds              = number
    visibility_timeout_seconds = number
    message_retention_seconds  = number
  })
  default = {
    "delay_seconds" : null,
    "visibility_timeout_seconds" : null,
    "message_retention_seconds" : null
  }
}

variable "queue_encryption" {
  description = "Configure how data on queues managed by the modules in ecrypted at REST. Options are encryped via SSE, non encrypted and via KMSS. By default encryptes via SSE is enabled. See for more details the Terraform `aws_sqs_queue` resource https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue."
  type = object({
    kms_data_key_reuse_period_seconds = number
    kms_master_key_id                 = string
    sqs_managed_sse_enabled           = bool
  })
  default = {
    kms_data_key_reuse_period_seconds = null
    kms_master_key_id                 = null
    sqs_managed_sse_enabled           = true
  }
  validation {
    condition     = var.queue_encryption == null || var.queue_encryption.sqs_managed_sse_enabled != null && var.queue_encryption.kms_master_key_id == null && var.queue_encryption.kms_data_key_reuse_period_seconds == null || var.queue_encryption.sqs_managed_sse_enabled == null && var.queue_encryption.kms_master_key_id != null
    error_message = "Invalid configuration for `queue_encryption`. Valid configurations are encryption disabled, enabled via SSE. Or encryption via KMS."
  }
}

variable "ecs_family_prefix" {
  description = "Prefix of the task definition family to search For When launching runners."
  type        = string
}

variable "ecs_security_groups" {
  description = "Security groups to apply to the runner tasks"
  type        = list(string)
}

variable "secret_ttl" {
  description = "Time in seconds that the lambda should cache SSM parameters"
  type        = string
  default     = 30
}
  