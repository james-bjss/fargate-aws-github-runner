// Demo VPC to host runners
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.11.2"

  name = "vpc-fargate-demo"
  cidr = "10.0.0.0/16"

  azs             = ["${local.aws_region}a", "${local.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_dns_hostnames    = true
  enable_nat_gateway      = true
  map_public_ip_on_launch = false
  single_nat_gateway      = true

  tags = merge(var.tags, {
    "ghr:environment" = var.prefix
  })
}

# Use a VPC-GWE reduce NGW data xfer charges when pulling from ACR
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = module.vpc.vpc_id
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat(module.vpc.private_route_table_ids, module.vpc.public_route_table_ids)
  service_name      = format("com.amazonaws.%s.s3", local.aws_region)
}