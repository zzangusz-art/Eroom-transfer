@echo off
cd /d "%~dp0"
echo =====================================
echo   eroom-lms deploy (GitHub to Railway)
echo =====================================
git --version >nul 2>&1
if errorlevel 1 goto NOGIT
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0push.ps1"
echo.
echo Done. Open this to verify:
echo   https://eroom-transfer-production.up.railway.app/version
pause
exit /b 0
:NOGIT
echo.
echo [ERROR] Git is NOT installed on this PC.
echo Install Git for Windows: https://git-scm.com/download/win
echo Then run deploy.bat again.
echo Or tell Claude you prefer GitHub Desktop instead.
pause
exit /b 1
