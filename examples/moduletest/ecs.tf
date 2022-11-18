module "ecs" {
  source = "terraform-aws-modules/ecs/aws"

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
    Environment = "Development"
    Project     = "GHRunner"
  }
}


data "aws_ecr_repository" "linux_agent" {
  name = "gh-agent/ubuntu"
}

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
          awslogs-region : local.region,
          awslogs-create-group : "true",
          awslogs-stream-prefix : "ecs"
        }
    } }
  ])
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "1024"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.ecsTaskExecutionRole.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  tags = {
    "GH:labels" = "self-hosted linux x64"
  }
}

resource "aws_cloudwatch_log_group" "ecs_runner" {
  name              = "/ecs/gh_runner/gh_runner"
  retention_in_days = 1
}


// Role for pulling images and logging
resource "aws_iam_role" "ecsTaskExecutionRole" {
  name               = "ecsRunnerTaskExecutionRole"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
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

resource "aws_iam_role_policy" "execution_role_logging" {
  name = "runner-lambda-logging-policy" // naming
  role = aws_iam_role.ecsTaskExecutionRole.name
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

//TODO: Make the same
resource "aws_iam_role" "ecs_task_role" {
  name               = "runner-task-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}

resource "aws_iam_role_policy" "runner_task_ssm" {
  role = aws_iam_role.ecs_task_role.name
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : [
          "ssm:GetParameter"
        ],
        "Resource" : ["arn:aws:ssm:${var.region}:${local.accountid}:parameter/gh_actions/token/*"]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecsTaskExecutionRole_policy" {
  role       = aws_iam_role.ecsTaskExecutionRole.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}