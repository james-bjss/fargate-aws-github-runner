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
    }
  ])
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "1024"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.ecsTaskExecutionRole.arn
  tags = {
    "GH:labels" = "linux x86"
  }
}

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

resource "aws_iam_role_policy_attachment" "ecsTaskExecutionRole_policy" {
  role       = aws_iam_role.ecsTaskExecutionRole.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}