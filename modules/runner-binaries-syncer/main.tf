resource "aws_s3_bucket" "action_dist" {
  bucket        = var.distribution_bucket_name
  force_destroy = true
  tags          = var.tags
}
