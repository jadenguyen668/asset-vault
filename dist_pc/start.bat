@echo off
title AssetVault Local Server
echo ===================================================
echo     AssetVault - Starting Local PC Version
echo ===================================================
echo.
echo Make sure you have Node.js installed on your PC.
echo To configure the Spine converter, check the .env file
echo.
set PORT=3000
set HOSTNAME=localhost
set NODE_ENV=production

echo Starting server on http://localhost:3000 ...
node server.js

pause
