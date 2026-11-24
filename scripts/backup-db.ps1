# Script Backup Database PostgreSQL COMPASS (PowerShell Windows)
param(
    [string]$DbHost = "localhost",
    [string]$DbPort = "5433",
    [string]$DbUser = "compass",
    [string]$DbName = "compass_db",
    [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpFile = "$BackupDir\compass_db_backup_$timestamp.sql"

Write-Host "Memulai backup database $DbName dari ${DbHost}:${DbPort}..."

$env:PGPASSWORD = if ($env:PGPASSWORD) { $env:PGPASSWORD } else { "compass123" }

& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -h $DbHost -p $DbPort -U $DbUser $DbName -f $dumpFile

if (Test-Path $dumpFile) {
    $size = (Get-Item $dumpFile).Length / 1KB
    Write-Host ("Backup sukses: " + $dumpFile + " (" + [math]::Round($size, 2) + " KB)") -ForegroundColor Green
} else {
    Write-Host "Gagal membuat file backup." -ForegroundColor Red
}
