$DistDir = "dist_pc"

Write-Host "Cleaning up old build..."
if (Test-Path $DistDir) {
    Remove-Item -Recurse -Force $DistDir
}

Write-Host "Creating dist directory..."
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

Write-Host "Copying standalone build..."
Copy-Item -Recurse -Force ".next\standalone\*" -Destination $DistDir

Write-Host "Copying public folder..."
Copy-Item -Recurse -Force "public" -Destination "$DistDir\public"

Write-Host "Copying static assets..."
if (!(Test-Path "$DistDir\.next\static")) {
    New-Item -ItemType Directory -Force -Path "$DistDir\.next\static" | Out-Null
}
Copy-Item -Recurse -Force ".next\static\*" -Destination "$DistDir\.next\static"

Write-Host "Copying environment variables..."
if (Test-Path ".env.local") {
    Copy-Item ".env.local" -Destination "$DistDir\.env.local"
}
if (Test-Path ".env") {
    Copy-Item ".env" -Destination "$DistDir\.env"
}

Write-Host "Creating start.bat..."
$BatContent = @"
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
"@
Set-Content -Path "$DistDir\start.bat" -Value $BatContent

Write-Host "Creating zip package..."
if (Test-Path "AssetVault-PC.zip") {
    Remove-Item "AssetVault-PC.zip"
}
Compress-Archive -Path "$DistDir\*" -DestinationPath "AssetVault-PC.zip"

Write-Host "Done! The package is ready at AssetVault-PC.zip"
