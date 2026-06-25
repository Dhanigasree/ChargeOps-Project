# Remote backend is disabled because the lab SCP currently denies access to the
# S3 state object. This workspace uses the local terraform.tfstate file.
#
# terraform {
#   backend "s3" {
#     bucket       = "chargeops-terraform-state-497676936148-ap-south-1"
#     key          = "eks/terraform.tfstate"
#     region       = "ap-south-1"
#     encrypt      = true
#     kms_key_id   = "alias/chargeops-terraform-state"
#     use_lockfile = true
#   }
# }
