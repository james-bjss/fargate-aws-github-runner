resource "aws_ecs_task_definition" "service" {
  family = "gh_linux"
  container_definitions = jsonencode([
    {
      name         = "runner"
      image        = var.repository_name
      cpu          = 256
      memory       = 512
      essential    = true
      portMappings = []
    }
  ])
  tags = {
    "GH:labels" = "linux x86"
  }
}