# Demo ECS Cluster where runner Tasks will be deployed
module "ecs" {
  source  = "terraform-aws-modules/ecs/aws"
  version = "4.1.2"

  cluster_name = "ecs-fargate"

  cluster_configuration = {
    execute_command_configuration = {
      logging = "OVERRIDE"
      log_configuration = {
        cloud_watch_log_group_name = "/aws/ecs/aws-ec2"
      }
    }
  }

  fargate_capacity_providers = {
    FARGATE = {}
  }

  tags = {
    Environment = var.prefix
  }
}

# Repository Where Runner container  image is stored
data "aws_ecr_repository" "linux_agent" {
  name = "gh-agent/ubuntu"
}

# Task definition for Runner Tasks - Linux/Ubuntu
resource "aws_ecs_task_definition" "service" {
  family = "gh_linux"
  container_definitions = jsonencode([
    {
      name         = "runner"
      image        = "${data.aws_ecr_repository.linux_agent.repository_url}:latest"
      cpu          = 256
      memory       = 512
      essential    = true
      portMappings = []
      linuxParameters = {
        initProcessEnabled = true
      }
      logConfiguration = {
        logDriver : "awslogs",
        options : {
          awslogs-group : aws_cloudwatch_log_group.ecs_runner.name,
          awslogs-region : local.aws_region,
          awslogs-create-group : "true",
          awslogs-stream-prefix : "ecs"
        }
    } }
  ])
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "1024"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  tags = {
    "GH:labels" = "self-hosted linux x64"
  }
}

# Cloudwatch group for runner logs
resource "aws_cloudwatch_log_group" "ecs_runner" {
  name              = "/ecs/gh_runner/gh_runner"
  retention_in_days = 1
}


data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Exection role. This grants the ability to log to Cloudatch and pull Images from ECR
resource "aws_iam_role" "ecs_execution_role" {
  name               = "${var.prefix}-runner-execution-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}

# Role to allow ECS Tasks to log to cloudwatch
resource "aws_iam_role_policy" "execution_role_logging" {
  name = "${var.prefix}-ecs-logging"
  role = aws_iam_role.ecs_execution_role.name
  policy = templatefile("policies/ecs-execution-cloudwatch.json", {
    log_group_arn = aws_cloudwatch_log_group.ecs_runner.arn
  })
}

# Standard policy for pulling from ECR
resource "aws_iam_role_policy_attachment" "ecs_execution_role" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:${local.aws_partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}


# Role granted to the executing task in ECS
resource "aws_iam_role" "ecs_task_role" {
  name               = "${var.prefix}-runner-task-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}

# Role granting task access to runner registration tokens in SSM
resource "aws_iam_role_policy" "runner_task_ssm" {
  role = aws_iam_role.ecs_task_role.name
  policy = templatefile("policies/ecs-task-ssm.json", {
    region                = local.aws_region
    account_id            = local.account_id
    runner_token_ssm_path = var.runner_token_path
  })
}

