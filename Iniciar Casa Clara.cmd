@echo off
setlocal
cd /d "%~dp0"
start "Casa Clara" /min cmd /k "cd /d ""%~dp0"" && npm run dev"
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"
