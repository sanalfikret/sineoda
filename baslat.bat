@echo off
title Sineoda
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo.
echo  ========================================
echo   Sineoda baslatiliyor...
echo   Site: http://localhost:5173
echo  ========================================
echo.
echo  Bu pencereyi KAPATMAYIN.
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo HATA: Node.js bulunamadi.
  echo Lutfen https://nodejs.org adresinden Node.js kurun.
  pause
  exit /b 1
)

echo Eski oturumlar kapatiliyor...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo Paketler kontrol ediliyor...
call npm install
if errorlevel 1 goto :fail

cd server
call npm install
cd ..
if errorlevel 1 goto :fail

start "" cmd /c "timeout /t 8 /nobreak >nul && start http://localhost:5173"

call npm run dev
goto :end

:fail
echo.
echo HATA: Baslatma basarisiz. Yukaridaki mesaji okuyun.
pause
exit /b 1

:end
pause
