@echo off
REM Plooy tam paket: site + API zip
REM Site API: .env.cpanel icindeki VITE_API_URL

setlocal
cd /d "%~dp0..\.."

echo === 1/3 Frontend build ===
if exist .env.cpanel (
  for /f "usebackq tokens=1,* delims==" %%a in (".env.cpanel") do (
    if "%%a"=="VITE_API_URL" set VITE_API_URL=%%b
  )
)
if "%VITE_API_URL%"=="" (
  echo HATA: .env.cpanel yok veya VITE_API_URL bos.
  exit /b 1
)
echo VITE_API_URL=%VITE_API_URL%
set VITE_API_URL=%VITE_API_URL%
call npm run build
if errorlevel 1 exit /b 1

echo === 2/3 Site zip ===
set SITE_STAGE=deploy\cpanel\_site_stage
set SITE_OUT=deploy\cpanel\Plooy-site.zip
if exist "%SITE_STAGE%" rmdir /s /q "%SITE_STAGE%"
mkdir "%SITE_STAGE%\site"
xcopy /E /I /Y /Q dist\* "%SITE_STAGE%\site\" >nul
copy /Y deploy\cpanel\public_html.htaccess "%SITE_STAGE%\site\.htaccess" >nul
if exist "%SITE_OUT%" del /f "%SITE_OUT%"
powershell -NoProfile -Command "Compress-Archive -Path '%SITE_STAGE%\site\*' -DestinationPath '%SITE_OUT%' -Force"
rmdir /s /q "%SITE_STAGE%"
if errorlevel 1 exit /b 1

echo === 3/3 API zip ===
call deploy\cpanel\build-api.bat
if errorlevel 1 exit /b 1

echo.
echo TAMAM:
echo   %SITE_OUT%
echo   deploy\cpanel\Plooy-api.zip
echo.
endlocal
