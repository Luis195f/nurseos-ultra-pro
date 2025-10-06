param([string]$Root = ".")
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Has($p,[switch]$Dir){ if($Dir){Test-Path $p -PathType Container}else{Test-Path $p -PathType Leaf} }
function Check($n,$ok,$hint){ [pscustomobject]@{ Name=$n; Ok=$ok; Hint=$hint } }

Push-Location $Root
$checks = @()
$checks += Check "CI (.github/workflows/ci.yml)" (Has ".github/workflows/ci.yml") "Unifica CI si falta."
$checks += Check "Issue templates" (Has ".github/ISSUE_TEMPLATE" -Dir) "Añade bug/feature."
$checks += Check "PR template" (Has ".github/PULL_REQUEST_TEMPLATE.md") "Plantilla PR."
$checks += Check "CODEOWNERS" (Has ".github/CODEOWNERS") "Definir revisores."
$checks += Check ".editorconfig" (Has ".editorconfig") "Estilos consistentes."
$checks += Check "Web scales loader" (Has "apps/web/src/scales/scalesLoader.ts") "Debe usar ./definitions/*.json"
$checks += Check "Playwright" (Has "apps/web/playwright.config.ts") "Configurar E2E"
$checks += Check "E2E specs" (Has "apps/web/e2e" -Dir) "Handover smoke presente"
$checks += Check "FastAPI main" (Has "apps/api/app/main.py") "API presente"
$checks += Check "Agents service" (Has "services/agents-service/app/main.py") "Agentes presente"
$md = @()
$md += "# NurseOS Repo Audit (auto)"
$md += "`n`n## Estado"
foreach($c in $checks){ $icon = if($c.Ok){'✅'}else{'❌'}; $md += "- $icon **$($c.Name)** — $($c.Hint)" }
$path = Join-Path (Get-Location) "audit_report.md"
Set-Content -Path $path -Value ($md -join "`n") -Encoding UTF8
Write-Host "Generado: $path"
Pop-Location
