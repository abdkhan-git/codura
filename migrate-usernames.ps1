# PowerShell script to run username migration with proper environment variables

Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan

# Load .env file
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "  ✓ Loaded $name" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  ✗ .env file not found" -ForegroundColor Red
    exit 1
}

Write-Host "`nRunning migration script...`n" -ForegroundColor Cyan

# Run the migration
npx tsx scripts/migrate-usernames.ts

Write-Host "`nDone!" -ForegroundColor Green
