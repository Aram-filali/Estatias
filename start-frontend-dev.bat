@echo off
setlocal
echo ========================================================
echo Lancement des Frontends Estatias (MODE DEVELOPPEMENT)
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
echo [frontend] Lancement en DEV (Rechargement a chaud sur le port 3002)...
call pm2.cmd delete "frontend-dev" >nul 2>&1
call pm2.cmd start cmd.exe --interpreter none --name "frontend-dev" -- /c "npm run dev -- --turbopack -p 3002"

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
echo [front_p] Lancement en DEV (Rechargement a chaud sur le port 3001)...
call pm2.cmd delete "front_p-dev" >nul 2>&1
call pm2.cmd start cmd.exe --interpreter none --name "front_p-dev" -- /c "npm run dev -- --turbopack -p 3001"

cd ..
echo.
echo ========================================================
echo Frontends lances avec succes en developpement !
echo ========================================================
call pm2.cmd list

echo.
echo Accedez a votre Frontend principal sur       : http://localhost:3002
echo Accedez a votre Frontend plateforme (front_p): http://localhost:3001
echo.
echo * Pour visualiser vos erreurs Next.js en direct : pm2 logs
echo * Pour arreter tous les services en cours : pm2 stop all
echo * Pour reinitialiser : pm2 delete all
echo.

pause
