variable "aws_region" {
  description = "AWS region."
  type        = string
}

variable "aws_account_id" {
  description = "AWS account id"
  type        = string
}

variable "aws_partition" {
  description = "(optional) partition in the arn namespace to use if not 'aws'"
  type        = string
  default     = "aws"
}

variable "subnet_ids" {
  description = "List of subnets in which the action runners will be launched, the subnets needs to be subnets in the `vpc_id`."
  type        = list(string)
}

variable "tags" {
  description = "Map of tags that will be added to created resources. By default resources will be tagged with name."
  type        = map(string)
  default     = {}
}

variable "prefix" {
  description = "The prefix used for naming resources"
  type        = string
  default     = "github-actions"
}

variable "sqs_build_queue" {
  description = "SQS queue to consume accepted build events."
  type = object({
    arn = string
  })
}

variable "enable_organization_runners" {
  type = bool
}

variable "github_app_parameters" {
  description = "Parameter Store for GitHub App Parameters."
  type = object({
    key_base64 = map(string)
    id         = map(string)
  })
}

variable "runner_group_name" {
  description = "Name of the runner group."
  type        = string
  default     = "Default"
}

variable "lambda_zip" {
  description = "File location of the lambda zip file."
  type        = string
}

variable "scale_up_reserved_concurrent_executions" {
  description = "Amount of reserved concurrent executions for the scale-up lambda function. A value of 0 disables lambda from being triggered and -1 removes any concurrency limitations."
  type        = number
  default     = 1
}

variable "lambda_timeout_scale_up" {
  description = "Time out for the scale up lambda in seconds."
  type        = number
  default     = 60
}

variable "role_permissions_boundary" {
  description = "Permissions boundary that will be added to the created role for the lambda."
  type        = string
  default     = null
}

variable "role_path" {
  description = "The path that will be added to the role; if not set, the prefix will be used."
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

variable "ghes_url" {
  description = "GitHub Enterprise Server URL. DO NOT SET IF USING PUBLIC GITHUB"
  type        = string
  default     = null
}

variable "lambda_subnet_ids" {
  description = "List of subnets in which the lambda will be launched, the subnets needs to be subnets in the `vpc_id`."
  type        = list(string)
  default     = []
}

variable "lambda_security_group_ids" {
  description = "List of security group IDs associated with the Lambda function."
  type        = list(string)
  default     = []
}

variable "kms_key_arn" {
  description = "Optional CMK Key ARN to be used for Parameter Store."
  type        = string
  default     = null
}

variable "log_level" {
  description = "Logging level for lambda logging. Valid values are 'trace', 'debug', 'info', 'warn', 'error''."
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
    error_message = "`log_level` value not valid. Valid values are trace', 'debug', 'info', 'warn', 'error'."
  }
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

# ECS Variables
variable "ecs_cluster_name" {
  description = "Arn of the cluster in which to launch runners"
  type        = string
}

variable "ecs_cluster_arn" {
  description = "Arn of the cluster in which to launch runners"
  type        = string
}

variable "ecs_execution_role_arn" {
  description = "Execution Role ARN for ECS runner tasks"
  type        = string
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
}

variable "runner_token_path" {
  description = "Path in SSM to store runner tokens"
  type        = string
  default     = "/actions_runner/tokens/"
  validation {
    condition     = can(regex("^/.*/$", var.runner_token_path))
    error_message = "Invalid token path. It should start and end with a slash ('/')."
  }
}