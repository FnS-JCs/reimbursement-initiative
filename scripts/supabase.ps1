$ErrorActionPreference = "Stop"

# Supabase CLI calls fail in this environment when inherited proxy variables
# point at an unavailable local proxy. Clear them for this process only.
$env:HTTP_PROXY = $null
$env:HTTPS_PROXY = $null
$env:ALL_PROXY = $null

$cliPath = Join-Path $PSScriptRoot "..\\node_modules\\.bin\\supabase.cmd"

if (-not (Test-Path $cliPath)) {
  Write-Error "Supabase CLI not found at $cliPath. Run 'npm install' first."
}

& $cliPath @args
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  exit $exitCode
}
