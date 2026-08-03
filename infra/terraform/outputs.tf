output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "ec2_public_ip" {
  value = aws_eip.main.public_ip
}
