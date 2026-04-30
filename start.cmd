@echo off
cd /d "%~dp0hassboard"

if not exist "node_modules" (
  echo Installing dependencies...
  npm install
)

start "HassBoard Server" cmd /k "npx tsx watch server/index.ts"
start "HassBoard Client" cmd /k "npx vite"
