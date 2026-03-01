@echo off
set DATABASE_URL=postgresql://travel_planner:local_dev_password_not_secret@localhost:5432/travel_planner_dev
cd C:\travel-planner
npx prisma migrate deploy > C:\travel-planner\_migrate_out.txt 2>&1
echo EXIT:%ERRORLEVEL% >> C:\travel-planner\_migrate_out.txt
