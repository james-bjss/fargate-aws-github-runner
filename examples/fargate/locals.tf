
locals {
  environment = "development"
  aws_region  = "us-east-1"
  accountid   = data.aws_caller_identity.current.account_id
  region      = data.aws_region.current.name
}