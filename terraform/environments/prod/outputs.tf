output "instance_id" {
  description = "EC2 instance ID"
  value       = module.compute.instance_id
}

output "elastic_ip" {
  description = "Elastic IP address of the server"
  value       = module.compute.elastic_ip
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = module.compute.ssh_command
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "iam_role_arn" {
  description = "IAM role ARN attached to the EC2 instance"
  value       = module.security.iam_role_arn
}
