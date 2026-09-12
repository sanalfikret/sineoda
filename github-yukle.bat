@echo off
title Plooy - GitHub Yukle
cd /d "%~dp0"
set "GIT=C:\Program Files\Git\bin\git.exe"

if not exist "%GIT%" (
  echo HATA: Git bulunamadi.
  pause
  exit /b 1
)

echo.
echo  GitHub'a yukleniyor...
echo  Gerekirse tarayicida GitHub girisi acilir.
echo.

"%GIT%" push -u origin main

if errorlevel 1 (
  echo.
  echo  HATA: Yukleme basarisiz.
  echo  Internet baglantisini ve GitHub girisini kontrol edip bu dosyayi yeniden calistir.
  pause
  exit /b 1
)

echo.
echo  BASARILI! Kod GitHub'a yuklendi.
echo  https://github.com/sanalfikret/Plooy
echo.
pause
