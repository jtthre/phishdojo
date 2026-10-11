# Envoie tes changements sur GitHub : branche, pull request, puis fusion automatique quand la
# CI est verte (la branche main est protegee, on n'y pousse jamais directement).
# Usage, depuis le dossier du projet :
#   .\envoyer.ps1 "Ajoute la page d'accueil"
param([Parameter(Mandatory = $true)][string]$Message)

$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot

# restes d'anciennes versions livrees sur le PC
foreach ($p in 'docs\CLOUD.md', 'scripts\demarrage-session.sh', 'ci\github\workflows\deploy.yml', 'ci\github\workflows\claude.yml') { if (Test-Path $p) { Remove-Item -Recurse -Force $p } }
if (Test-Path 'ci\github') { New-Item -ItemType Directory -Force '.github\workflows' | Out-Null; Copy-Item 'ci\github\workflows\*.yml' '.github\workflows\' -Force; Copy-Item 'ci\github\dependabot.yml' '.github\' -Force }
if (Test-Path 'ci\claude') { New-Item -ItemType Directory -Force '.claude' | Out-Null; Copy-Item 'ci\claude\*' '.claude\' -Recurse -Force }
if (Test-Path 'ci') { Remove-Item -Recurse -Force 'ci' }

if (-not (git status --porcelain)) { Write-Host 'Rien a envoyer.'; exit 0 }

$branche = git branch --show-current
if ($branche -notlike 'maj/*') {
  git pull --ff-only -q
  $branche = 'maj/' + (Get-Date -Format 'yyyyMMdd-HHmmss')
  git switch -q -c $branche
}
git add -A
git commit -q -m $Message
git push -q -u origin $branche
if ($LASTEXITCODE -ne 0) { Write-Host 'Push refuse (voir ci-dessus).' -ForegroundColor Red; exit 1 }

gh pr view $branche *> $null
if ($LASTEXITCODE -ne 0) { gh pr create --base main --head $branche --title $Message --body "Envoye avec envoyer.ps1. Fusion automatique quand la CI est verte." | Out-Null }
gh pr merge $branche --auto --squash --delete-branch | Out-Null
Write-Host "Pull request ouverte, la CI tourne..." -ForegroundColor Cyan

Start-Sleep -Seconds 20
gh pr checks $branche --watch --interval 20
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nLa CI a echoue : la pull request reste ouverte. Corrige, puis relance .\envoyer.ps1 avec un message." -ForegroundColor Red
  exit 1
}
for ($i = 0; $i -lt 30; $i++) {
  if ((gh pr view $branche --json state --jq .state) -eq 'MERGED') { break }
  Start-Sleep -Seconds 10
}
git switch -q main
git pull -q --ff-only
git branch -D $branche *> $null
Write-Host "`nFusionne dans main. Le deploiement est en cours : gh run watch" -ForegroundColor Green
