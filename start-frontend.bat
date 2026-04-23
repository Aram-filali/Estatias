@echo off
setlocal
echo ========================================================
echo Lancement du Frontend Estatias en Production...
echo ========================================================

REM Verification de l'installation de pm2
call pm2.cmd -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo PM2 n'est pas installe. Installation en cours...
    call npm install -g pm2
)

echo.
echo [frontend] Installation des dependances...
cd frontend
if not exist "node_modules" (
    echo [frontend] node_modules absent - installation en cours...
    call npm install
) else (
    echo [frontend] node_modules deja present - installation ignoree
)
echo [frontend] Compilation de la version optimale...
call npm run build
echo [frontend] Demarrage avec PM2 (sur le port 3002)...
call pm2.cmd delete "frontend-nextjs" >nul 2>&1
call pm2.cmd start cmd.exe --interpreter none --name "frontend-nextjs" -- /c "npm run start -- --port 3002"

cd ..
echo.
echo [front_p] Installation des dependances (plateforme)...
cd front_p
if not exist "node_modules" (
    echo [front_p] node_modules absent - installation en cours...
    call npm install
) else (
    echo [front_p] node_modules deja present - installation ignoree
)
echo [front_p] Compilation de la version optimale...
call npm run build
echo [front_p] Demarrage avec PM2 (Force le port 3001 pour eviter tout conflit)...
call pm2.cmd delete "front_p-nextjs" >nul 2>&1
call pm2.cmd start cmd.exe --interpreter none --name "front_p-nextjs" -- /c "npm run start -- --port 3001"

cd ..
echo.
echo ========================================================
echo Frontends lances avec succes !
echo ========================================================
call pm2.cmd list

echo.
echo Accedez a votre application frontend 1 : http://localhost:3002
echo Accedez a votre application frontend 2 : http://localhost:3001
echo.
echo * Pour visualiser les verifer qu'aucun bug n'a lieu: pm2 logs
echo.

pause
