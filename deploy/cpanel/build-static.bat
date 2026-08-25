@echo off
REM cPanel icin statik frontend build (Windows)
REM 1) deploy\cpanel\env.static.example dosyasini .env.cpanel olarak kopyalayip VITE_API_URL duzenle
REM 2) Bu scripti calistir
REM 3) dist\ icindekileri FTP ile public_html'e yukle
REM 4) deploy\cpanel\public_html.htaccess -> public_html\.htaccess

setlocal
cd /d "%~dp0..\.."

if exist .env.cpanel (
  for /f "usebackq tokens=1,* delims==" %%a in (".env.cpanel") do (
    if "%%a"=="VITE_API_URL" set VITE_API_URL=%%b
  )
)

if "%VITE_API_URL%"=="" (
  echo HATA: .env.cpanel yok veya VITE_API_URL bos.
  echo Ornek: copy deploy\cpanel\env.static.example .env.cpanel
  exit /b 1
)

echo Build: VITE_API_URL=%VITE_API_URL%
set VITE_API_URL=%VITE_API_URL%
call npm run build
if errorlevel 1 exit /b 1

echo.
echo TAMAM. Simdi yukle:
echo   dist\*  --^>  public_html/
echo   deploy\cpanel\public_html.htaccess  --^>  public_html\.htaccess
echo.
endlocal
