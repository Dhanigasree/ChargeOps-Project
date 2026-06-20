param(
  [string]$Region = "ap-south-1",
  [string]$AccountId = "497676936148",
  [string]$Repository = "chargeops/ai-service",
  [string]$Branch = "test",
  [string]$ServiceDir = "ev-backend/services/ai-service",
  [string]$ProjectName = ""
)

$ErrorActionPreference = "Stop"

if (-not $ProjectName) {
  $ProjectName = "chargeops-" + ($Repository -replace "/", "-") + "-image-build"
}
$RoleName = "chargeops-codebuild-ai-image-role"
$RoleArn = "arn:aws:iam::$AccountId`:role/$RoleName"
$RepoUri = "$AccountId.dkr.ecr.$Region.amazonaws.com/$Repository"
$CommitSha = (git rev-parse HEAD).Trim()

$TempDir = Join-Path $env:TEMP "chargeops-ai-codebuild"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

$TrustPolicyPath = Join-Path $TempDir "trust-policy.json"
$PermissionPolicyPath = Join-Path $TempDir "permission-policy.json"
$SourcePath = Join-Path $TempDir "source.json"
$EnvironmentPath = Join-Path $TempDir "environment.json"
$ArtifactsPath = Join-Path $TempDir "artifacts.json"

function Write-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $Encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $Encoding)
}

@{
  Version = "2012-10-17"
  Statement = @(
    @{
      Effect = "Allow"
      Principal = @{ Service = "codebuild.amazonaws.com" }
      Action = "sts:AssumeRole"
    }
  )
} | ConvertTo-Json -Depth 10 | ForEach-Object { Write-Utf8NoBom -Path $TrustPolicyPath -Content $_ }

@{
  Version = "2012-10-17"
  Statement = @(
    @{
      Effect = "Allow"
      Action = @(
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      )
      Resource = "*"
    },
    @{
      Effect = "Allow"
      Action = "ecr:GetAuthorizationToken"
      Resource = "*"
    },
    @{
      Effect = "Allow"
      Action = @(
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      )
      Resource = "arn:aws:ecr:$Region`:$AccountId`:repository/chargeops/*"
    }
  )
} | ConvertTo-Json -Depth 10 | ForEach-Object { Write-Utf8NoBom -Path $PermissionPolicyPath -Content $_ }

$BuildSpec = @"
version: 0.2
phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR
      - aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $AccountId.dkr.ecr.$Region.amazonaws.com
      - git clone --branch $Branch https://github.com/Dhanigasree/ChargeOps.git /tmp/chargeops
      - cd /tmp/chargeops
      - git checkout $CommitSha
  build:
    commands:
      - echo Building $Repository image
      - docker build -t $RepoUri`:latest -t $RepoUri`:$CommitSha $ServiceDir
  post_build:
    commands:
      - echo Pushing $Repository image
      - docker push $RepoUri`:latest
      - docker push $RepoUri`:$CommitSha
"@

@{
  type = "NO_SOURCE"
  buildspec = $BuildSpec
} | ConvertTo-Json -Depth 10 | ForEach-Object { Write-Utf8NoBom -Path $SourcePath -Content $_ }

@{
  type = "LINUX_CONTAINER"
  image = "aws/codebuild/standard:7.0"
  computeType = "BUILD_GENERAL1_SMALL"
  privilegedMode = $true
} | ConvertTo-Json -Depth 10 | ForEach-Object { Write-Utf8NoBom -Path $EnvironmentPath -Content $_ }

@{ type = "NO_ARTIFACTS" } | ConvertTo-Json -Depth 10 | ForEach-Object { Write-Utf8NoBom -Path $ArtifactsPath -Content $_ }

$RoleExists = $true
try {
  aws iam get-role --role-name $RoleName --region $Region 2>$null | Out-Null
} catch {
  $RoleExists = $false
}

if (-not $RoleExists) {
  aws iam create-role --role-name $RoleName --assume-role-policy-document "file://$TrustPolicyPath" --region $Region | Out-Null
}

aws iam put-role-policy `
  --role-name $RoleName `
  --policy-name "chargeops-codebuild-ai-image-policy" `
  --policy-document "file://$PermissionPolicyPath" `
  --region $Region | Out-Null

Start-Sleep -Seconds 10

$ProjectExists = aws codebuild batch-get-projects --names $ProjectName --region $Region --query "projects[0].name" --output text 2>$null
if ($ProjectExists -eq $ProjectName) {
  aws codebuild update-project `
    --name $ProjectName `
    --source "file://$SourcePath" `
    --environment "file://$EnvironmentPath" `
    --artifacts "file://$ArtifactsPath" `
    --service-role $RoleArn `
    --region $Region | Out-Null
} else {
  aws codebuild create-project `
    --name $ProjectName `
    --source "file://$SourcePath" `
    --environment "file://$EnvironmentPath" `
    --artifacts "file://$ArtifactsPath" `
    --service-role $RoleArn `
    --region $Region | Out-Null
}

$BuildId = (aws codebuild start-build `
  --project-name $ProjectName `
  --source-type-override NO_SOURCE `
  --buildspec-override $BuildSpec `
  --region $Region `
  --query "build.id" `
  --output text).Trim()
Write-Host "Started CodeBuild build: $BuildId"

do {
  Start-Sleep -Seconds 15
  $Build = aws codebuild batch-get-builds --ids $BuildId --region $Region | ConvertFrom-Json
  $Status = $Build.builds[0].buildStatus
  Write-Host "Build status: $Status"
} while ($Status -in @("IN_PROGRESS", "QUEUED"))

if ($Status -ne "SUCCEEDED") {
  $Logs = $Build.builds[0].logs.deepLink
  throw "CodeBuild image build failed with status $Status. Logs: $Logs"
}

Write-Host "Image pushed successfully:"
Write-Host "$RepoUri`:latest"
Write-Host "$RepoUri`:$CommitSha"
