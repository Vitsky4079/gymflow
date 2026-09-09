@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js LTS from https://nodejs.org then run START.bat again.
  pause
  exit /b 1
)
node server.mjs
pause
