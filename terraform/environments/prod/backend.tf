# Uncomment to enable S3 remote backend (requires existing S3 bucket + DynamoDB table)
#
# terraform {
#   backend "s3" {
#     bucket         = "fintech-server-terraform-state"
#     key            = "prod/terraform.tfstate"
#     region         = "ap-south-1"
#     dynamodb_table = "fintech-server-terraform-locks"
#     encrypt        = true
#   }
# }
