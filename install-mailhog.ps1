# Install Mailhog for Windows
# This script downloads Mailhog binary from GitHub

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Installing Mailhog for Windows" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$installDir = "$env:USERPROFILE\mailhog"
$mailhogExe = "$installDir\mailhog.exe"
$downloadUrl = "https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_windows_amd64.exe"

# Create installation directory
Write-Host " Creating installation directory..." -ForegroundColor Yellow
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}

# Download Mailhog
Write-Host "  Downloading Mailhog from GitHub..." -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $mailhogExe -UseBasicParsing
    Write-Host " Download complete!`n" -ForegroundColor Green
} catch {
    Write-Host " Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nPlease download manually from:" -ForegroundColor Yellow
    Write-Host "https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_windows_amd64.exe`n" -ForegroundColor White
    exit 1
}

# Verify installation
Write-Host " Mailhog installed successfully!`n" -ForegroundColor Green
Write-Host " Installation location: $mailhogExe" -ForegroundColor White
Write-Host "`n To start Mailhog, run:" -ForegroundColor Cyan
Write-Host "   & '$mailhogExe'`n" -ForegroundColor White

# Ask to start now
$start = Read-Host "Start Mailhog now? (y/n)"
if ($start -eq 'y') {
    Write-Host "`n Starting Mailhog..." -ForegroundColor Cyan
    Write-Host "   SMTP Server: localhost:1025" -ForegroundColor White
    Write-Host "   Web UI: http://localhost:8025" -ForegroundColor White
    Write-Host "`nPress Ctrl+C to stop`n" -ForegroundColor Yellow
    & $mailhogExe
}
