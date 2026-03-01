@echo off
cd C:\travel-planner
set DATABASE_URL=postgresql://travel_planner:local_dev_password_not_secret@localhost:5432/travel_planner_dev
set REDIS_URL=redis://localhost:6379

echo =^> Running migrations...
call npx prisma migrate deploy
if %ERRORLEVEL% neq 0 ( echo Migration failed & exit /b 1 )

echo.
echo =^> Seeding test user...
call npx prisma db seed
if %ERRORLEVEL% neq 0 ( echo Seed failed & exit /b 1 )

echo.
echo Done! Login at http://localhost:3000/auth/login
echo   email:    test@test.com
echo   password: Test1234!
