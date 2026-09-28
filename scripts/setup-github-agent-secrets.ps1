# Pushes agent secrets to the GitHub repo. Never prints secret values.
# Usage:
#   .\scripts\setup-github-agent-secrets.ps1 -DatabaseUrl "postgresql://...@...neon.tech/neondb?sslmode=require"
param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) { throw "Missing $envFile" }
if ($DatabaseUrl -match "localhost|127\.0\.0\.1") {
  throw "DATABASE_URL must be a hosted Postgres URL, not localhost."
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
  $name, $value = $_ -split "=", 2
  $vars[$name.Trim()] = $value.Trim().Trim('"').Trim("'")
}

function Require-Env([string]$key) {
  $value = $vars[$key]
  if ([string]::IsNullOrWhiteSpace($value)) { throw ".env is missing $key" }
  return $value
}

$jwt = Require-Env "JWT_SECRET"
$key = Require-Env "ENCRYPTION_KEY"
if ($jwt.Length -lt 32) { throw "JWT_SECRET must be at least 32 characters" }

gh secret set DATABASE_URL --body $DatabaseUrl
gh secret set JWT_SECRET --body $jwt
gh secret set ENCRYPTION_KEY --body $key
Write-Host "Set DATABASE_URL, JWT_SECRET, and ENCRYPTION_KEY on the GitHub repo."
Write-Host "Run the Unattended agent workflow once with mode=discover, or wait for the schedule."
