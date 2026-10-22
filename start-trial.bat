@echo off
chcp 65001 >nul
echo ===== Awtad BD Hub - Trial =====
docker info >nul 2>&1
if errorlevel 1 (
  echo Docker Desktop is not running. Start Docker Desktop, wait until it says "Engine running", then run this file again.
  pause
  exit /b 1
)
docker compose -f docker-compose.trial.yml up -d --build
if errorlevel 1 ( pause & exit /b 1 )
echo Waiting for the system to start...
timeout /t 15 /nobreak >nul
start http://localhost:8080
echo.
echo Open http://localhost:8080   - user: admin  password: Trial-Admin-2026
echo To stop:  docker compose -f docker-compose.trial.yml down
pause
