variable "vpc_id" {
  description = "ID of the VPC for the security group"
  type        = string
}

variable "server_port" {
  description = "Port the server application runs on"
  type        = number
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into the instance"
  type        = string
}

variable "project_name" {
  description = "Project name used for resource tagging"
  type        = string
}
