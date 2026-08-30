@echo off
title Plooy - Ngrok Token Kur
cd /d "%~dp0"

echo.
echo  1) Ngrok sitesinde Copy tusuna bas:
echo     https://dashboard.ngrok.com/get-started/your-authtoken
echo.
echo  2) Notepad acilacak - tokeni yapistir
echo  3) Ctrl+S ile kaydet, Notepad'i kapat
echo  4) Sonra ngrok-baslat.bat calistir
echo.
pause

if not exist "ngrok-token.txt" echo.>ngrok-token.txt
notepad ngrok-token.txt

echo.
echo  Tamam. Simdi ngrok-baslat.bat dosyasina cift tikla.
echo.
pause
