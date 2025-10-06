param([string]$Root = ".")
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
function Has($p,[switch]$Dir){ if($Dir){Test-Path $p -PathType Container}else{Test-Path $p -PathType Leaf} }
function Check($n,$ok,$hint){ [pscustomobject]@{ Name=$n; Ok=$ok; Hint=$hint } }
Push-Location $Root
$checks = @()
$checks += Check "CI (.github/workflows/ci.yml)" (Has ".github/workflows/ci.yml") "Unificado"
$checks += Check "Issue templates" (Has ".github/ISSUE_TEMPLATE" -Dir) "Bug/Feature"
$checks += Check "PR template" (Has ".github/PULL_REQUEST_TEMPLATE.md") "Plantilla PR"
$checks += Check "CODEOWNERS" (Has ".github/CODEOWNERS") "Revisores"
$checks += Check ".editorconfig" (Has ".editorconfig") "EOL/indent"
$checks += Check "Scales loader" (Has "apps/web/src/scales/scalesLoader.ts") "import.meta.glob('./definitions/*.json')"
$checks += Check "Scales definitions" (Has "apps/web/src/scales/definitions" -Dir) "JSONs presentes"
$checks += Check "Playwright" (Has "apps/web/e2e" -Dir) "Smoke handover"
$checks += Check "FastAPI main" (Has "apps/api/app/main.py") "API presente"
$checks += Check "Agents main" (Has "services/agents-service/app/main.py") "Agentes presente"
$md = @("# NurseOS Repo Audit (auto)","`n`n## Estado")
foreach($c in $checks){ $icon = if($c.Ok){'✅'}else{'❌'}; $md += "- $icon **$($c.Name)** — $($c.Hint)" }
Set-Content -Path "audit_report.md" -Value ($md -join "`n") -Encoding UTF8
Write-Host "Generado: audit_report.md"
Pop-Location
