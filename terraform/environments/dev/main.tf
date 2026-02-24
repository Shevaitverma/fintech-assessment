terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "dev"
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  }
}

module "networking" {
  source = "../../modules/networking"

  vpc_cidr           = var.vpc_cidr
  public_subnet_cidr = var.public_subnet_cidr
  availability_zone  = "${var.aws_region}a"
  project_name       = var.project_name
}

module "security" {
  source = "../../modules/security"

  vpc_id           = module.networking.vpc_id
  server_port      = var.server_port
  allowed_ssh_cidr = var.allowed_ssh_cidr
  project_name     = var.project_name
}

module "compute" {
  source = "../../modules/compute"

  instance_type         = var.instance_type
  key_pair_name         = var.key_pair_name
  subnet_id             = module.networking.public_subnet_id
  security_group_id     = module.security.security_group_id
  instance_profile_name = module.security.instance_profile_name
  ebs_volume_size       = var.ebs_volume_size
  project_name          = var.project_name
}
