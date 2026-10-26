# Run from PowerShell. Requires Docker Desktop using Linux containers.
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Install and start Docker Desktop first, using Linux containers.'
    }
    & docker compose version
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose is unavailable. Update Docker Desktop.' }
    & docker info | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop and wait until its engine is running.' }
    if (-not (Test-Path -LiteralPath '.env.local')) {
        Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
        Write-Host 'Created .env.local. Add your Gemini API key there, then run this command again.'
        exit 1
    }
    & docker compose up --build -d --wait --wait-timeout 120
    if ($LASTEXITCODE -ne 0) { throw 'Startup failed. Run: docker compose logs --tail=50 app' }
    Write-Host 'French Education Helper is running: http://localhost:3000'
    Write-Host 'History: http://localhost:3000/history'
    Write-Host 'Keep this computer and Docker running for access from other devices.'
}
finally {
    Pop-Location
}
