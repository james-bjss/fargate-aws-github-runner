data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  runnerpath = "../../lambda/runner/dist/runner.zip"
  accountid = data.aws_caller_identity.current.account_id
  region = data.aws_region.current.name
}

resource "aws_lambda_function" "runner" {
  description   = "GH ECS Runner"
  function_name = "gh_runner"

  filename = local.runnerpath
  role     = aws_iam_role.runner_role.arn
  handler  = "index.handler"
  runtime  = "nodejs16.x"
  publish  = true

  source_code_hash = filebase64sha256(local.runnerpath)

  environment {
    variables = {
      ECS_CLUSTER         = module.ecs.cluster_name
      ECS_SUBNETS         = join(",", module.vpc.private_subnets)
      ECS_SECURITY_GROUPS = aws_security_group.default_runner_group.id
    }
  }
}

resource "aws_lambda_event_source_mapping" "create_runner" {
  event_source_arn = aws_sqs_queue.webhook_events_workflow_job_queue.arn
  function_name    = aws_lambda_function.runner.arn
  batch_size       = 1
}

resource "aws_cloudwatch_log_group" "runner" {
  name              = "/aws/lambda/${aws_lambda_function.runner.function_name}"
  retention_in_days = 1
}

resource "aws_iam_role" "runner_role" {
  name = "iam_for_runner_lambda"

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

resource "aws_iam_role_policy" "runner_logging" {
  name = "runner-lambda-logging-policy" // naming
  role = aws_iam_role.runner_role.name
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : ["logs:CreateLogStream", "logs:PutLogEvents"],
        "Resource" : "${aws_cloudwatch_log_group.runner.arn}*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "runner_sqs" {
  name = "runner-lambda-sqs-policy" // naming
  role = aws_iam_role.runner_role.name
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
        "Resource" : aws_sqs_queue.webhook_events_workflow_job_queue.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "runner_ecs" {
  name = "runner-lambda-ecs-policy" // naming
  role = aws_iam_role.runner_role.name
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : ["ecs:ListTaskDefinitionFamilies", "ecs:ListTaskDefinitions"],
        "Resource" : "*"
      },
      {
        "Effect" : "Allow",
        "Action" : [
          "ecs:RunTask"
        ],
        "Condition" : {
          "ArnEquals" : {
            "ecs:cluster" : module.ecs.cluster_arn
          }
        },
        "Resource" : [
          "arn:aws:ecs:${local.region}:${local.accountid}:task-definition/gh_*"
        ]
      }
    ]
  })
}

// for testing
resource "aws_security_group" "default_runner_group" {
  name        = "allow_runner"
  description = "Allow Outbound Runner Traffic"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}
