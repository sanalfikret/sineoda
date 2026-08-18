@echo off
title Sineoda Online
cd /d "%~dp0"

echo.
echo  ========================================
echo   Sineoda - Online Test
echo  ========================================
echo.
echo  Not: Ngrok surumu eski oldugu icin
echo  Cloudflare Tunnel kullaniliyor.
echo  Token gerekmez.
echo.

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo HATA: cloudflared bulunamadi.
  echo Kurulum: winget install Cloudflare.cloudflared
  pause
  exit /b 1
)

netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo  HATA: Site calismiyor ^(port 5173 kapali^).
  echo.
  echo  Once baslat.bat dosyasini ac ve bekleyin.
  echo  Site http://localhost:5173 acilinca tekrar dene.
  echo.
  echo  baslat.bat simdi aciliyor...
  start "" "%~dp0baslat.bat"
  echo.
  echo  15 saniye bekleniyor...
  timeout /t 15 /nobreak >nul
)

netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo  HATA: Site hala acilmadi. baslat.bat penceresini kontrol et.
  pause
  exit /b 1
)

echo  Site calisiyor!
echo.
echo  Online link asagida gorunecek:
echo  https://xxxx.trycloudflare.com
echo.
echo  Bu pencereyi KAPATMAYIN.
echo.

cloudflared tunnel --url http://127.0.0.1:5173
pause
