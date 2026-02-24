# Terraform Infrastructure — Technical Documentation

This document covers the full Terraform setup for the fintech-server project: what every file does, what every block of code means, and the exact steps to provision infrastructure from scratch.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Architecture Overview](#3-architecture-overview)
4. [Module Breakdown — Code Explained](#4-module-breakdown--code-explained)
   - 4.1 [Networking Module](#41-networking-module)
   - 4.2 [Security Module](#42-security-module)
   - 4.3 [Compute Module](#43-compute-module)
5. [Environment Configs — Code Explained](#5-environment-configs--code-explained)
   - 5.1 [Dev Environment](#51-dev-environment)
   - 5.2 [Prod Environment](#52-prod-environment)
6. [Step-by-Step Provisioning Guide](#6-step-by-step-provisioning-guide)
7. [Post-Provisioning — Manual Setup on EC2](#7-post-provisioning--manual-setup-on-ec2)
8. [Teardown](#8-teardown)
9. [Remote Backend Setup (Optional)](#9-remote-backend-setup-optional)
10. [Variables Reference](#10-variables-reference)
11. [Security Features](#11-security-features)

---

## 1. Prerequisites

Before you begin, you need these installed on your local machine:

| Tool | Version | Purpose |
|---|---|---|
| [Terraform](https://developer.hashicorp.com/terraform/downloads) | >= 1.0 | Infrastructure as Code CLI |
| [AWS CLI](https://aws.amazon.com/cli/) | v2 | AWS credential management |

**AWS account setup:**

1. Create an IAM user (or use SSO) with programmatic access.
2. Attach the `AdministratorAccess` policy (or a scoped policy covering EC2, VPC, IAM, EIP).
3. Configure credentials locally:

```bash
aws configure
# Enter: Access Key ID, Secret Access Key, region (ap-south-1), output format (json)
```

This writes to `~/.aws/credentials` and `~/.aws/config`. Terraform reads these automatically.

4. **Create an EC2 Key Pair** in the AWS Console (EC2 > Key Pairs > Create key pair). Download the `.pem` file and keep it safe — you need it to SSH into your server.

---

## 2. Project Structure

```
terraform/
├── .gitignore                          # Prevents secrets and state from being committed
├── TERRAFORM.md                        # This document
├── modules/                            # Reusable infrastructure components
│   ├── networking/                     # VPC, Subnet, Internet Gateway, Routes
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── security/                       # Security Group, IAM Role, Instance Profile
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── compute/                        # EC2 Instance, AMI lookup, Elastic IP
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── userdata.sh                 # Bootstrap script (Docker + Git install)
└── environments/                       # Environment-specific configurations
    ├── dev/                            # Development (t2.micro, open SSH, 20GB disk)
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   ├── backend.tf
    │   └── terraform.tfvars.example
    └── prod/                           # Production (t3.small, restricted SSH, 30GB disk)
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        ├── backend.tf
        └── terraform.tfvars.example
```

**Why this structure?**

- **`modules/`** — Shared building blocks. You write the logic once. Both dev and prod reuse the same modules with different input values.
- **`environments/`** — Each environment is an independent Terraform root. They have their own state, their own variables, and can be deployed/destroyed independently.

---

## 3. Architecture Overview

### What gets created

```
┌─────────────────────────────────────────────────────┐
│                        VPC                          │
│                   (10.0.0.0/16)                     │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │           Public Subnet (10.0.1.0/24)       │   │
│   │                                             │   │
│   │   ┌─────────────────────────────────────┐   │   │
│   │   │          EC2 Instance               │   │   │
│   │   │  - Ubuntu 24.04 LTS                  │   │   │
│   │   │  - Docker + Docker Compose + Git    │   │   │
│   │   │  - IMDSv2 enforced                  │   │   │
│   │   │  - Encrypted EBS (gp3)              │   │   │
│   │   │  - IAM Role (SSM + CloudWatch)      │   │   │
│   │   └─────────────────────────────────────┘   │   │
│   │              │                               │   │
│   │         Elastic IP (stable public address)   │   │
│   └─────────────────────────────────────────────┘   │
│              │                                       │
│     Internet Gateway                                 │
└──────────────┼──────────────────────────────────────┘
               │
           Internet
```

### Data flow between modules

```
networking ──(vpc_id)──────────────> security
networking ──(public_subnet_id)───> compute
security  ──(security_group_id)──> compute
security  ──(instance_profile_name)──> compute
```

The networking module creates the network. The security module creates firewall rules and IAM roles inside that network. The compute module places an EC2 instance into that network with those rules.

---

## 4. Module Breakdown — Code Explained

### 4.1 Networking Module

**File: `modules/networking/main.tf`**

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr            # IP range for the entire VPC (default: 10.0.0.0/16 = 65,536 IPs)
  enable_dns_support   = true                    # Allows instances to resolve DNS names
  enable_dns_hostnames = true                    # Assigns DNS hostnames to instances (needed for public DNS)
  ...
}
```

**What is a VPC?** A Virtual Private Cloud is your own isolated network inside AWS. Nothing can reach your resources unless you explicitly allow it. The `cidr_block` defines the total pool of private IP addresses available.

```hcl
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id      # Places this subnet inside our VPC
  cidr_block              = var.public_subnet_cidr # Subset of VPC IPs (default: 10.0.1.0/24 = 256 IPs)
  availability_zone       = var.availability_zone  # Physical datacenter within the region (e.g., ap-south-1a)
  map_public_ip_on_launch = true                   # Instances launched here automatically get a public IP
  ...
}
```

**What is a Subnet?** A subdivision of your VPC. This is a *public* subnet — instances here can talk to the internet (via the Internet Gateway below). The `availability_zone` pins it to a specific datacenter for physical redundancy.

```hcl
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id      # Attaches to our VPC
  ...
}
```

**What is an Internet Gateway (IGW)?** The doorway between your VPC and the public internet. Without it, nothing in your VPC can reach the outside world, and nobody outside can reach your resources.

```hcl
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"                    # "All traffic" (any destination)
    gateway_id = aws_internet_gateway.main.id    # Send it through the Internet Gateway
  }
  ...
}
```

**What is a Route Table?** A set of rules (routes) that determine where network traffic goes. The route `0.0.0.0/0 -> IGW` means "any traffic not destined for the VPC itself should go to the internet."

```hcl
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}
```

This links the route table to our subnet. Without this association, the subnet would use the VPC's default route table (which has no internet route).

**Outputs:** The module exports `vpc_id`, `public_subnet_id`, and `igw_id` so other modules can reference them.

---

### 4.2 Security Module

**File: `modules/security/main.tf`**

#### Security Group (Firewall)

```hcl
resource "aws_security_group" "server" {
  name   = "${var.project_name}-sg"
  vpc_id = var.vpc_id                  # Attach to the VPC created by networking module
  ...
}
```

**What is a Security Group?** A virtual firewall that controls inbound and outbound traffic for your EC2 instance. It operates at the instance level (not subnet level).

**Ingress rules (inbound traffic):**

| Rule | Port | Source | Purpose |
|---|---|---|---|
| SSH | 22 | `var.allowed_ssh_cidr` | Remote terminal access. In dev this defaults to `0.0.0.0/0` (anywhere). In prod you must set your specific IP. |
| App | `var.server_port` | `0.0.0.0/0` | Your application port (default 8080). Open to the world so users can reach your API. |
| HTTP | 80 | `0.0.0.0/0` | Standard web traffic. Useful if you add a reverse proxy (Nginx/Caddy) later. |
| HTTPS | 443 | `0.0.0.0/0` | Encrypted web traffic. Needed when you add TLS/SSL. |

**Egress rule (outbound traffic):**

```hcl
egress {
  from_port   = 0
  to_port     = 0
  protocol    = "-1"            # "-1" means ALL protocols
  cidr_blocks = ["0.0.0.0/0"]  # Allow traffic to anywhere
}
```

This allows the EC2 instance to make outbound connections (download packages, pull Docker images, connect to MongoDB Atlas, etc.).

#### IAM Role

```hcl
resource "aws_iam_role" "ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}
```

**What is an IAM Role?** An identity with permissions that an EC2 instance can "assume." Instead of embedding AWS access keys on the server, the instance automatically gets temporary credentials through this role.

The `assume_role_policy` (trust policy) says: "Only the EC2 service can use this role." No human, no Lambda, no other service — only EC2.

#### Policy Attachments

```hcl
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
```

**SSM (Systems Manager):** Lets you connect to the instance via AWS Session Manager — a browser-based shell — without opening SSH port 22. Useful as a backup access method.

```hcl
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}
```

**CloudWatch Agent:** Lets the instance ship logs and metrics to CloudWatch. You can install the CloudWatch agent later to monitor CPU, memory, disk, and application logs from the AWS Console.

#### Instance Profile

```hcl
resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}
```

**What is an Instance Profile?** A container that passes the IAM role to an EC2 instance. You cannot attach a role directly to EC2 — you attach it through a profile. Think of it as an adapter.

**Outputs:** `security_group_id`, `instance_profile_name`, `iam_role_arn`.

---

### 4.3 Compute Module

**File: `modules/compute/main.tf`**

#### AMI Data Source

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true                    # Pick the newest matching AMI
  owners      = ["099720109477"]        # Canonical — official Ubuntu publisher

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]   # Ubuntu 24.04 LTS
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]                    # Hardware Virtual Machine (modern, required for most instance types)
  }

  filter {
    name   = "state"
    values = ["available"]              # Only AMIs that are ready to use
  }
}
```

**What is a `data` source?** Unlike `resource` blocks (which *create* things), `data` blocks *look up* existing things. This queries AWS for the latest Ubuntu 24.04 LTS AMI published by Canonical (`099720109477`) in whatever region you deploy to, so you never have to hardcode region-specific AMI IDs.

#### EC2 Instance

```hcl
resource "aws_instance" "server" {
  ami                    = data.aws_ami.ubuntu.id          # Uses the Ubuntu AMI found above
  instance_type          = var.instance_type               # dev=t2.micro, prod=t3.small
  key_name               = var.key_pair_name               # Your SSH key pair name (created in AWS Console)
  subnet_id              = var.subnet_id                   # From networking module
  vpc_security_group_ids = [var.security_group_id]         # From security module
  iam_instance_profile   = var.instance_profile_name       # From security module

  user_data = file("${path.module}/userdata.sh")           # Bootstrap script that runs on first boot
  ...
}
```

**What is `user_data`?** A script that AWS runs automatically when the instance boots for the *first time*. It runs as root. Our script installs Docker (from Docker's official apt repository), Docker Compose (as a Docker plugin), and Git.

**`${path.module}`** refers to the directory where this `.tf` file lives (`modules/compute/`), so it correctly finds `userdata.sh` regardless of where you run `terraform apply` from.

#### IMDSv2 (Instance Metadata Service v2)

```hcl
metadata_options {
  http_endpoint               = "enabled"     # Allow metadata service
  http_tokens                 = "required"    # ENFORCE IMDSv2 (token-based)
  http_put_response_hop_limit = 1             # Prevent metadata access from containers/proxies
}
```

**Why IMDSv2?** The Instance Metadata Service lets code running on the instance query `http://169.254.169.254/` for information like the instance ID, IAM credentials, etc. IMDSv1 is vulnerable to SSRF attacks (a web app could be tricked into fetching credentials). IMDSv2 requires a session token, blocking this attack vector. `hop_limit = 1` ensures only the instance itself (not Docker containers) can reach metadata.

#### EBS (Root Volume)

```hcl
root_block_device {
  volume_size = var.ebs_volume_size    # dev=20GB, prod=30GB
  volume_type = "gp3"                  # General Purpose SSD v3 (3000 IOPS baseline, cheapest SSD)
  encrypted   = true                   # Encrypts data at rest with AWS-managed key
}
```

**What is EBS?** Elastic Block Store — the virtual hard drive attached to your EC2 instance. `gp3` is the current-generation SSD offering the best price/performance for general workloads. Encryption protects data if someone gains physical access to AWS hardware or snapshots your volume.

#### Elastic IP

```hcl
resource "aws_eip" "server" {
  instance = aws_instance.server.id    # Associates with our instance
  domain   = "vpc"                     # Required for VPC-based instances
  ...
}
```

**What is an Elastic IP?** A static public IPv4 address. Without it, your instance gets a random public IP that changes every time you stop/start it. With an Elastic IP, the address stays the same — critical for DNS records, API clients, SSH configs, etc.

> **Cost note:** An Elastic IP is free while attached to a *running* instance. AWS charges ~$3.65/month if the instance is stopped but the EIP remains allocated.

#### userdata.sh

```bash
#!/bin/bash
set -e                          # Exit immediately if any command fails

apt-get update && apt-get upgrade -y    # Update all system packages

# Install Docker from official Docker apt repository
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl start docker          # Start Docker daemon now
systemctl enable docker         # Start Docker automatically on every boot

usermod -aG docker ubuntu       # Let ubuntu user run docker commands without sudo

apt-get install -y git          # Install Git for cloning repositories
```

After this runs, the instance is ready for you to SSH in and manually set up your application.

**Outputs:** `instance_id`, `elastic_ip`, `ssh_command`.

---

## 5. Environment Configs — Code Explained

### 5.1 Dev Environment

**File: `environments/dev/main.tf`**

```hcl
terraform {
  required_version = ">= 1.0"              # Minimum Terraform CLI version

  required_providers {
    aws = {
      source  = "hashicorp/aws"             # Official AWS provider from HashiCorp registry
      version = "~> 5.0"                    # Any 5.x version (5.0, 5.1, ... 5.100)
    }
  }
}
```

**What does `~> 5.0` mean?** The pessimistic constraint operator. It allows `5.x` but not `6.0`. This prevents breaking changes from a major version bump while still getting patches and features.

```hcl
provider "aws" {
  region = var.aws_region                   # Default: ap-south-1 (Mumbai)

  default_tags {
    tags = {
      Environment = "dev"                   # Auto-applied to EVERY resource
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  }
}
```

**What are `default_tags`?** Tags that Terraform automatically adds to every AWS resource created by this configuration. You don't need to add `tags {}` to each resource individually. This is how you track costs by environment/project in AWS Billing, find resources in the console, and identify Terraform-managed resources.

```hcl
module "networking" {
  source = "../../modules/networking"       # Path to the module directory

  vpc_cidr           = var.vpc_cidr         # "10.0.0.0/16"
  public_subnet_cidr = var.public_subnet_cidr  # "10.0.1.0/24"
  availability_zone  = "${var.aws_region}a"    # e.g., "ap-south-1a"
  project_name       = var.project_name
}
```

**What is a `module` block?** It calls a reusable module (like calling a function). `source` points to where the module code lives. The arguments below `source` are the input variables the module expects.

```hcl
module "security" {
  source = "../../modules/security"

  vpc_id           = module.networking.vpc_id        # Output from networking module
  server_port      = var.server_port
  allowed_ssh_cidr = var.allowed_ssh_cidr
  project_name     = var.project_name
}
```

Notice `module.networking.vpc_id` — this is how modules pass data to each other. The networking module creates a VPC and outputs its ID. The security module consumes that ID to create the security group in the same VPC.

```hcl
module "compute" {
  source = "../../modules/compute"

  instance_type         = var.instance_type              # "t2.micro"
  key_pair_name         = var.key_pair_name
  subnet_id             = module.networking.public_subnet_id
  security_group_id     = module.security.security_group_id
  instance_profile_name = module.security.instance_profile_name
  ebs_volume_size       = var.ebs_volume_size            # 20 GB
  project_name          = var.project_name
}
```

The compute module receives outputs from *both* networking and security. This is the dependency chain:

```
networking creates VPC + Subnet
    ↓
security creates SG + IAM in that VPC
    ↓
compute places EC2 in that Subnet with that SG + IAM
```

Terraform automatically figures out the correct creation order from these references.

### 5.2 Prod Environment

Prod uses the same modules but with different defaults:

| Variable | Dev | Prod |
|---|---|---|
| `instance_type` | `t2.micro` (free tier) | `t3.small` (2 vCPU, 2GB RAM) |
| `ebs_volume_size` | 20 GB | 30 GB |
| `allowed_ssh_cidr` | `0.0.0.0/0` (open) | **No default** — you must set it |

The prod `allowed_ssh_cidr` has no default on purpose. Terraform will refuse to run unless you explicitly provide your IP (e.g., `203.0.113.50/32`), preventing accidental open SSH in production.

---

## 6. Step-by-Step Provisioning Guide

### Step 1: Create an AWS Key Pair

Go to **AWS Console > EC2 > Key Pairs > Create key pair**.
- Name: e.g., `fintech-server-key`
- Type: RSA
- Format: `.pem`

Save the downloaded `.pem` file securely. Set permissions:

```bash
chmod 400 fintech-server-key.pem
```

### Step 2: Navigate to the environment

```bash
cd terraform/environments/dev        # or terraform/environments/prod
```

### Step 3: Create your variables file

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your actual values:

```hcl
key_pair_name    = "fintech-server-key"     # Must match the key pair name in AWS
allowed_ssh_cidr = "YOUR.PUBLIC.IP/32"      # Find your IP: curl ifconfig.me
```

> `terraform.tfvars` is in `.gitignore` — it will never be committed.

### Step 4: Initialize Terraform

```bash
terraform init
```

This does three things:
1. Downloads the AWS provider plugin (~350MB) into `.terraform/`
2. Resolves the module paths (validates they exist)
3. Creates `.terraform.lock.hcl` (locks provider versions)

Expected output: `Terraform has been successfully initialized!`

### Step 5: Preview the plan

```bash
terraform plan
```

This shows you *exactly* what Terraform will create, modify, or destroy — without actually doing anything. Review the output carefully.

You'll see something like:

```
Plan: 12 to add, 0 to change, 0 to destroy.
```

The 12 resources are:
1. VPC
2. Subnet
3. Internet Gateway
4. Route Table
5. Route Table Association
6. Security Group
7. IAM Role
8. IAM Policy Attachment (SSM)
9. IAM Policy Attachment (CloudWatch)
10. IAM Instance Profile
11. EC2 Instance
12. Elastic IP

### Step 6: Apply

```bash
terraform apply
```

Terraform shows the plan again and asks for confirmation. Type `yes` and press Enter.

This takes 2-4 minutes. Once complete, you'll see the outputs:

```
Outputs:

elastic_ip  = "13.235.XX.XX"
instance_id = "i-0abc123def456789"
ssh_command = "ssh -i <your-key>.pem ec2-user@13.235.XX.XX"
vpc_id      = "vpc-0abc123def456789"
iam_role_arn = "arn:aws:iam::123456789012:role/fintech-server-ec2-role"
```

### Step 7: Verify

```bash
# Check outputs anytime
terraform output

# Test SSH access (replace with your key path)
ssh -i ~/fintech-server-key.pem ubuntu@$(terraform output -raw elastic_ip)
```

---

## 7. Post-Provisioning — Manual Setup on EC2

After SSH-ing into the instance, Docker and Git are already installed. You set up the application manually:

```bash
# Verify Docker is running
docker --version
docker compose version

# Clone your repository
git clone https://github.com/your-username/fintech-assessment.git
cd fintech-assessment

# Create your .env file
nano .env

# Build and run
docker compose up -d

# Check logs
docker compose logs -f
```

---

## 8. Teardown

To destroy all resources created by Terraform:

```bash
cd terraform/environments/dev    # or prod
terraform destroy
```

Type `yes` to confirm. This removes everything: EC2, EIP, VPC, IAM roles — all of it. Terraform destroys in the correct reverse order (EC2 before subnet, subnet before VPC, etc.).

> **Important:** The Elastic IP will be released. If you had DNS records pointing to it, they will break.

---

## 9. Remote Backend Setup (Optional)

By default, Terraform stores state locally in `terraform.tfstate`. For team usage, you can use S3 + DynamoDB for shared, locked state.

### Create the backend resources (one-time)

```bash
# S3 bucket for state storage
aws s3api create-bucket \
  --bucket fintech-server-terraform-state \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Enable versioning (so you can recover old state)
aws s3api put-bucket-versioning \
  --bucket fintech-server-terraform-state \
  --versioning-configuration Status=Enabled

# DynamoDB table for state locking (prevents concurrent modifications)
aws dynamodb create-table \
  --table-name fintech-server-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

### Enable the backend

Uncomment the `backend "s3"` block in `backend.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "fintech-server-terraform-state"
    key            = "dev/terraform.tfstate"       # or "prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "fintech-server-terraform-locks"
    encrypt        = true
  }
}
```

Then reinitialize:

```bash
terraform init
# Terraform will ask to migrate local state to S3 — type "yes"
```

---

## 10. Variables Reference

### Dev defaults (`environments/dev/variables.tf`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `aws_region` | string | `ap-south-1` | AWS region (Mumbai) |
| `project_name` | string | `fintech-server` | Used in all resource Name tags |
| `instance_type` | string | `t2.micro` | EC2 size (1 vCPU, 1GB RAM, free tier eligible) |
| `key_pair_name` | string | **required** | Name of your SSH key pair in AWS |
| `server_port` | number | `8080` | Port opened in security group for your app |
| `allowed_ssh_cidr` | string | `0.0.0.0/0` | Who can SSH in (open in dev) |
| `vpc_cidr` | string | `10.0.0.0/16` | VPC address range |
| `public_subnet_cidr` | string | `10.0.1.0/24` | Subnet address range |
| `ebs_volume_size` | number | `20` | Root disk size in GB |

### Prod overrides (`environments/prod/variables.tf`)

| Variable | Prod Default | Difference from Dev |
|---|---|---|
| `instance_type` | `t3.small` | More CPU/RAM for production traffic |
| `allowed_ssh_cidr` | **no default** | Must be explicitly set (e.g., `YOUR.IP/32`) |
| `ebs_volume_size` | `30` | More disk for logs, Docker images |

---

## 11. Security Features

| Feature | What it does | Where |
|---|---|---|
| **IMDSv2 enforced** | Blocks SSRF attacks from stealing instance credentials | `modules/compute/main.tf` — `metadata_options` |
| **EBS encryption** | Encrypts the disk at rest using AWS-managed keys | `modules/compute/main.tf` — `root_block_device` |
| **IAM role (no static keys)** | Instance gets temporary credentials automatically; no access keys on disk | `modules/security/main.tf` — `aws_iam_role` |
| **SSH CIDR restriction** | Prod forces you to specify allowed SSH source IPs | `environments/prod/variables.tf` — no default |
| **SSM Session Manager** | Browser-based shell access without SSH port open | `modules/security/main.tf` — SSM policy |
| **`default_tags`** | Every resource tagged for audit and cost tracking | `environments/*/main.tf` — provider block |
| **Elastic IP** | Stable address; prevents IP leakage on stop/start | `modules/compute/main.tf` — `aws_eip` |
| **`.gitignore`** | Prevents `terraform.tfvars` (secrets) and `.tfstate` (infra details) from being committed | `terraform/.gitignore` |
