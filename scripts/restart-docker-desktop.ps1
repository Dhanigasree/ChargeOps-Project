$ErrorActionPreference = "Continue"

$repoRoot = "C:\Users\admin\Desktop\ChargeOps"
$logPath = Join-Path $repoRoot "scripts\restart-docker-desktop.log"
$dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"

"[$(Get-Date -Format o)] Restarting Docker Desktop" | Out-File -FilePath $logPath -Encoding utf8

Get-Process "Docker Desktop", "com.docker.backend", "com.docker.build", "com.docker.proxy" -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue

wsl --shutdown 2>&1 | Tee-Object -FilePath $logPath -Append

Restart-Service com.docker.service -Force 2>&1 | Tee-Object -FilePath $logPath -Append

Start-Process -FilePath $dockerDesktop

$ready = $false
for ($i = 1; $i -le 60; $i++) {
  & $docker info *> $null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 5
}

if ($ready) {
  & $docker version 2>&1 | Tee-Object -FilePath $logPath -Append
  "[$(Get-Date -Format o)] Docker Desktop is ready" | Tee-Object -FilePath $logPath -Append
  exit 0
}

& $docker version 2>&1 | Tee-Object -FilePath $logPath -Append
"[$(Get-Date -Format o)] Docker Desktop did not become ready" | Tee-Object -FilePath $logPath -Append
exit 1
