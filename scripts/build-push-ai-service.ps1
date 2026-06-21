$ErrorActionPreference = "Stop"

$repoRoot = "C:\Users\admin\Desktop\ChargeOps"
$region = "ap-south-1"
$registry = "497676936148.dkr.ecr.ap-south-1.amazonaws.com"
$image = "$registry/chargeops/ai-service:latest"
$logPath = Join-Path $repoRoot "scripts\build-push-ai-service.log"
$aws = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"

Set-Location $repoRoot

"[$(Get-Date -Format o)] Starting ai-service image build and push" | Out-File -FilePath $logPath -Encoding utf8
"AWS CLI: $aws" | Tee-Object -FilePath $logPath -Append
"Docker CLI: $docker" | Tee-Object -FilePath $logPath -Append

try {
  & $docker version 2>&1 | Tee-Object -FilePath $logPath -Append

  & $aws ecr get-login-password --region $region |
    & $docker login --username AWS --password-stdin $registry 2>&1 |
    Tee-Object -FilePath $logPath -Append

  & $docker build -t $image .\ev-backend\services\ai-service 2>&1 |
    Tee-Object -FilePath $logPath -Append

  & $docker push $image 2>&1 |
    Tee-Object -FilePath $logPath -Append

  "[$(Get-Date -Format o)] Completed ai-service image build and push" | Tee-Object -FilePath $logPath -Append
} catch {
  "[$(Get-Date -Format o)] ERROR: $($_.Exception.Message)" | Tee-Object -FilePath $logPath -Append
  if ($_.ScriptStackTrace) {
    $_.ScriptStackTrace | Tee-Object -FilePath $logPath -Append
  }
  exit 1
}
