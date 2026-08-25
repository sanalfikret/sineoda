@echo off
REM cPanel icin API paketi (Node.js + tsx, build gerekmez)
REM 1) Bu scripti calistir -> deploy\cpanel\sineoda-api.zip
REM 2) cPanel'de alt domain + Setup Node.js App (KURULUM-API.txt)
REM 3) Zip'i ac, NPM Install, env degiskenleri, Restart

setlocal
cd /d "%~dp0..\.."

set STAGE=deploy\cpanel\_api_stage
set OUT=deploy\cpanel\sineoda-api.zip

if not exist server\package.json (
  echo HATA: server\package.json bulunamadi.
  exit /b 1
)

echo API paketi hazirlaniyor...
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%\sineoda-api"

xcopy /E /I /Y /Q server\src "%STAGE%\sineoda-api\src" >nul
copy /Y server\package.json "%STAGE%\sineoda-api\" >nul
if exist server\package-lock.json copy /Y server\package-lock.json "%STAGE%\sineoda-api\" >nul

mkdir "%STAGE%\sineoda-api\data" 2>nul
mkdir "%STAGE%\sineoda-api\uploads" 2>nul
echo SQLite ve yuklemeler burada tutulur. public_html DISINDA birak.> "%STAGE%\sineoda-api\data\README.txt"
echo Poster / gorsel yuklemeleri.> "%STAGE%\sineoda-api\uploads\README.txt"

if exist "%OUT%" del /f "%OUT%"
powershell -NoProfile -Command "Compress-Archive -Path '%STAGE%\sineoda-api' -DestinationPath '%OUT%' -Force"
if errorlevel 1 (
  echo HATA: Zip olusturulamadi.
  exit /b 1
)

rmdir /s /q "%STAGE%"

echo.
echo TAMAM: %OUT%
echo Sonraki adim: deploy\cpanel\KURULUM-API.txt
echo.
endlocal
