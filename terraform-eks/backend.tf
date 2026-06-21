# Local state is used for the initial EKS build.
# After the state bucket is created, uncomment and run:
# terraform init -migrate-state
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
