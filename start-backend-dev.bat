@echo off
setlocal enabledelayedexpansion
echo ========================================================
echo Lancement des Microservices Estatias (MODE DEVELOPPEMENT)
echo ========================================================

set "ROOT=%~dp0"
set "SERVICES_DIR=%ROOT%backendd\services"

if not exist "%SERVICES_DIR%" (
    echo Dossier introuvable: %SERVICES_DIR%
    exit /b 1
)

REM Resolution npm
set "NPM_BIN=npm.cmd"
where %NPM_BIN% >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    set "NPM_BIN=npm"
    where %NPM_BIN% >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo npm est introuvable dans le PATH. Installez Node.js puis reessayez.
        exit /b 1
    )
)

REM Resolution pm2
set "PM2_BIN=pm2.cmd"
where %PM2_BIN% >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    set "PM2_BIN=pm2"
    where %PM2_BIN% >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo PM2 n'est pas installe globalement. Installation de PM2...
        call %NPM_BIN% install -g pm2
        where pm2.cmd >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            set "PM2_BIN=pm2.cmd"
        ) else (
            set "PM2_BIN=pm2"
        )
    )
)

cd /d "%SERVICES_DIR%"

REM Boucle sur les services
for /d %%D in (*) do (
    set "SERVICE_NAME=%%~nD"

    if /I "!SERVICE_NAME!"=="config" (
        echo [!SERVICE_NAME!] Ignore ^(dossier de configuration^)
    ) else (
        if exist "%%D\package.json" (
            echo.
            echo [!SERVICE_NAME!] Installation des dependances...
            cd /d "%%D"
            call %NPM_BIN% install

            call %PM2_BIN% delete "!SERVICE_NAME!-dev" >nul 2>&1

            echo [!SERVICE_NAME!] Lancement en mode DEV - Rechargement automatique...
            call %PM2_BIN% start cmd.exe --interpreter none --name "!SERVICE_NAME!-dev" -- /c "npm run start:dev"

            cd /d "%SERVICES_DIR%"
        ) else (
            echo [!SERVICE_NAME!] Ignore ^(pas un microservice Node/Nest: package.json absent^)
        )
    )
)

echo.
echo ========================================================
echo Tous les microservices ont ete lances en mode DEV !
echo ========================================================
call %PM2_BIN% list

echo.
echo * Pour visualiser les logs en direct de vos microservices : pm2 logs
echo * Pour arreter tous les services en cours : pm2 stop all
echo * Pour reinitialiser completement PM2 : pm2 delete all
echo.

if /I "%~1"=="--no-pause" exit /b 0
pause
