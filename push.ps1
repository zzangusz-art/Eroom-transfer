param([string]$Repo = "https://github.com/zzangusz-art/Eroom-transfer.git")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "[1/5] cleaning nested folder and locks" -ForegroundColor Cyan
Remove-Item "eroom-lms" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "eroom_check" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item ".git\index.lock",".git\config.lock" -Force -ErrorAction SilentlyContinue

Write-Host "[2/5] re-init git repo (flatten to root)" -ForegroundColor Cyan
Remove-Item ".git" -Recurse -Force -ErrorAction SilentlyContinue
git init | Out-Null
git branch -M main
git config user.email "zzangusz@gmail.com"
git config user.name  "zzangusz-art"

Write-Host "[3/5] set remote: $Repo" -ForegroundColor Cyan
git remote add origin $Repo

Write-Host "[4/5] commit" -ForegroundColor Cyan
git add -A
git commit -m ("deploy eroom-lms " + (Get-Date -Format 'yyyy-MM-dd HH:mm')) | Out-Null

Write-Host "[5/5] force push to GitHub main" -ForegroundColor Cyan
git push -u origin main --force

Write-Host ""
Write-Host "SUCCESS. Railway will auto-redeploy in 1-2 minutes." -ForegroundColor Green
Write-Host "Verify: https://eroom-transfer-production.up.railway.app/version  (expect 1.2.0)" -ForegroundColor Yellow
