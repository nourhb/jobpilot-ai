# Writes a SQL dump of the local Docker Postgres. Do not commit the file.
$ErrorActionPreference = "Stop"
$out = Join-Path (Split-Path $PSScriptRoot -Parent) "jobpilot-local.dump.sql"
docker exec jobpilot-ai-postgres-1 pg_dump -U jobpilot -d jobpilot --no-owner --no-acl --clean --if-exists | Set-Content -Path $out -Encoding utf8
Write-Host "Wrote $out"
Write-Host "Import into Neon with: psql `"$env:DATABASE_URL`" -f jobpilot-local.dump.sql"
