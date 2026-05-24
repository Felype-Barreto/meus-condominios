$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Moraí Supabase deploy" -ForegroundColor Cyan
Write-Host "1. O navegador/terminal vai pedir login na sua conta Supabase."
Write-Host "2. Depois escolha o projeto correto quando o link pedir."
Write-Host "3. Em seguida as migrations serão aplicadas automaticamente."
Write-Host ""

npx supabase login
npx supabase link
npx supabase db push

Write-Host ""
Write-Host "Supabase configurado. Confira as variáveis do projeto no dashboard e preencha .env.local." -ForegroundColor Green
