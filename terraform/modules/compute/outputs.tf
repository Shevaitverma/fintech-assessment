output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.server.id
}

output "elastic_ip" {
  description = "Elastic IP address of the server"
  value       = aws_eip.server.public_ip
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i <your-key>.pem ec2-user@${aws_eip.server.public_ip}"
}
