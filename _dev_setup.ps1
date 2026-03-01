$env:DATABASE_URL = "postgresql://travel_planner:local_dev_password_not_secret@localhost:5432/travel_planner_dev"
$env:REDIS_URL = "redis://localhost:6379"

Set-Location C:\travel-planner

Write-Host "==> Running migrations..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-Host "Migration failed"; exit 1 }

Write-Host ""
Write-Host "==> Seeding test user..."
npx prisma db seed
if ($LASTEXITCODE -ne 0) { Write-Host "Seed failed"; exit 1 }

Write-Host ""
Write-Host "All done. You can now log in at http://localhost:3000/auth/login"
Write-Host "  email:    test@test.com"
Write-Host "  password: Test1234!"
