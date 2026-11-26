$dbUrl = "postgresql://postgres.fajfgdjghjbrtjutfpvv:ERArymF2a38a1Cts@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

$files = @(
    "backend/migrations/20261120000001_init.sql",
    "backend/migrations/20261120000002_rbac_members_tickets.sql",
    "backend/migrations/20261120000003_ticket_categories_active.sql",
    "backend/migrations/20261124000001_member_pin.sql",
    "backend/migrations/20261124000002_business_logic_fixes.sql"
)

foreach ($f in $files) {
    Write-Host "Applying: $f"
    & $psql -d $dbUrl -f $f
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed at $f"
        exit 1
    }
}

Write-Host "=== All migrations successfully applied to Supabase! ==="
