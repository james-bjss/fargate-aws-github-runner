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