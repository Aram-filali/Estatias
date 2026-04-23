@echo off
echo ========================================================
echo Arret de tous les services Estatias en cours...
echo ========================================================

call pm2 stop all
echo.
echo ========================================================
echo Nettoyage de la liste (Suppression)...
echo ========================================================
call pm2 delete all

echo.
echo Tous les Frontends et Microservices ont ete completement arretes !
pause
