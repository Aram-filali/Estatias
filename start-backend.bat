@echo off
setlocal enabledelayedexpansion
echo ========================================================
echo Lancement des Microservices Estatias en Production...
echo ========================================================

set "ROOT=%~dp0"
set "SERVICES_DIR=%ROOT%backendd\services"

if not exist "%SERVICES_DIR%" (
    echo Dossier introuvable: %SERVICES_DIR%
    exit /b 1
)

REM Verification de l'installation de pm2
call pm2.cmd -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo PM2 n'est pas installe globalement. Installation de PM2...
    call npm install -g pm2
)

cd /d "%SERVICES_DIR%"

REM Boucle sur chaque dossier de la liste des services
for /d %%i in (*) do (
    if /I "%%i"=="config" (
        echo [%%i] Ignore (dossier de configuration)
    ) else (
        if exist "%%i\package.json" (
            echo.
            echo [%%i] Preparation du service...
            cd /d "%%i"

            echo [%%i] Installation des dependances (npm install)...
            call npm install

            echo [%%i] Compilation du projet (npm run build)...
            call npm run build

            call pm2.cmd delete "%%i" >nul 2>&1

            echo [%%i] Lancement via PM2...
            call pm2.cmd start cmd.exe --interpreter none --name "%%i" -- /c "npm run start:prod"

            cd /d "%SERVICES_DIR%"
        ) else (
            echo [%%i] Ignore (pas un microservice Node/Nest: package.json absent)
        )
    )
)

echo.
echo ========================================================
echo Tous les microservices ont ete lances avec succes !
echo ========================================================
call pm2.cmd list

echo.
echo * Pour visualiser les logs en direct d'un service : pm2 logs nom-du-service
echo * Pour arreter tous les services : pm2 stop all
echo * Pour reinitialiser completement PM2 : pm2 delete all
echo.

pause
