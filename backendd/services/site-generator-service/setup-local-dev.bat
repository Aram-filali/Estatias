@echo off
REM setup-local-dev.bat - Script for setting up local development environment on Windows

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This script needs to be run as Administrator
    echo Right-click on the script and select "Run as administrator"
    pause
    exit /B 1
)

REM Define variables
set HOSTNAME=utapiknfknza3shpn4kccxg0x2k1.localhost
set IP_ADDRESS=127.0.0.1

REM Add entry to hosts file if it doesn't exist
findstr /C:"%HOSTNAME%" %WINDIR%\System32\drivers\etc\hosts >nul
if %errorlevel% neq 0 (
    echo Adding %HOSTNAME% to hosts file
    echo %IP_ADDRESS% %HOSTNAME% >> %WINDIR%\System32\drivers\etc\hosts
    echo Host added successfully
) else (
    echo %HOSTNAME% already exists in hosts file
)

REM Check if Nginx is installed
where nginx >nul 2>&1
if %errorlevel% neq 0 (
    echo Nginx is not found in PATH.
    echo Please install Nginx and run this script again.
    echo You can download Nginx from http://nginx.org/en/download.html
    pause
    exit /B 1
)

REM Get Nginx path and create directories
for /f "tokens=*" %%i in ('where nginx') do set NGINX_PATH=%%i
set NGINX_DIR=%NGINX_PATH:\nginx.exe=%
set NGINX_CONF_DIR=%NGINX_DIR%\conf
set NGINX_SITES_DIR=%NGINX_CONF_DIR%\sites-enabled
set NGINX_CONF_D_DIR=%NGINX_CONF_DIR%\conf.d

if not exist "%NGINX_SITES_DIR%" mkdir "%NGINX_SITES_DIR%"
if not exist "%NGINX_CONF_D_DIR%" mkdir "%NGINX_CONF_D_DIR%"

REM Create a basic nginx configuration
echo Creating Nginx configuration...
echo server {> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo     listen 80;>> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo     server_name ~^(.+)\.localhost;>> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo.>> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo     location / {>> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo         proxy_pass http://localhost:$http_x_forwarded_port;>> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo         proxy_set_header Host $host;>> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo         proxy_set_header X-Real-IP $remote_addr;>> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;>> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo         proxy_set_header X-Forwarded-Proto $scheme;>> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo     }>> "%NGINX_CONF_D_DIR%\local-dev.conf"
echo }>> "%NGINX_CONF_D_DIR%\local-dev.conf"

REM Update main nginx.conf to include our conf.d directory
findstr /C:"include conf.d/*.conf;" "%NGINX_CONF_DIR%\nginx.conf" >nul
if %errorlevel% neq 0 (
    echo Updating main nginx.conf to include conf.d directory
    powershell -Command "(gc '%NGINX_CONF_DIR%\nginx.conf') -replace 'http {', 'http {^n    include conf.d/*.conf;' | Out-File -encoding ASCII '%NGINX_CONF_DIR%\nginx.conf'"
)

REM Restart Nginx
echo Restarting Nginx...
taskkill /F /IM nginx.exe >nul 2>&1
start "" "%NGINX_PATH%"

echo Setup complete. You can now access your application at http://%HOSTNAME%
echo Make sure to set PROXY_DOMAIN=localhost in your .env file
pause