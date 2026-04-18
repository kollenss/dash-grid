@echo off
cd /d "%~dp0"
start "HassBoard Server" cmd /k "npx tsx watch server/index.ts"
start "HassBoard Client" cmd /k "npx vite"
