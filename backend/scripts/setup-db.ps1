# TransitOps — PostgreSQL setup script (Windows)
# Creates DB, applies schema.sql and seed.sql.

$ErrorActionPreference = "Stop"

function Get-PsqlPath {
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidates = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe"
  )

  foreach ($path in $candidates) {
    if (Test-Path $path) {
      return $path
    }
  }

  throw "psql not found. Add PostgreSQL bin folder to PATH or install PostgreSQL."
}

$Psql = Get-PsqlPath
$DbName = if ($env:DB_NAME) { $env:DB_NAME } else { "transitops" }
$DbUser = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }

if (-not $env:PGPASSWORD) {
  $env:PGPASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "postgres" }
}

$Root = Split-Path -Parent $PSScriptRoot
$Schema = Join-Path $Root "database\schema.sql"
$Seed = Join-Path $Root "database\seed.sql"

Write-Host "Using psql: $Psql" -ForegroundColor Gray
Write-Host "Checking PostgreSQL connection..." -ForegroundColor Cyan
& $Psql -U $DbUser -h $DbHost -p $DbPort -d postgres -c "SELECT version();" | Out-Null

Write-Host "Creating database '$DbName' if missing..." -ForegroundColor Cyan
$exists = & $Psql -U $DbUser -h $DbHost -p $DbPort -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DbName'"
if ($exists.Trim() -ne "1") {
  & $Psql -U $DbUser -h $DbHost -p $DbPort -d postgres -c "CREATE DATABASE $DbName;"
}

Write-Host "Applying schema..." -ForegroundColor Cyan
& $Psql -U $DbUser -h $DbHost -p $DbPort -d $DbName -f $Schema

Write-Host "Applying seed data..." -ForegroundColor Cyan
& $Psql -U $DbUser -h $DbHost -p $DbPort -d $DbName -f $Seed

Write-Host "Done. Database '$DbName' is ready." -ForegroundColor Green
