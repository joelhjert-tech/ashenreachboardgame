@echo off
setlocal EnableExtensions

cd /d "%~dp0"
title Ashen Reach - Local Game Server
cls

echo ============================================================
echo   ASHEN REACH
echo   Local TV Host and Phone Controller
echo ============================================================
echo.

set "RUNNING_PORT="
for /f "usebackq delims=" %%P in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\find-running-ashen-reach.ps1" -RepositoryRoot "%~dp0" 2^>nul`) do (
  if not defined RUNNING_PORT set "RUNNING_PORT=%%P"
)
if defined RUNNING_PORT goto :already_running

where node.exe >nul 2>nul
if errorlevel 1 goto :missing_node

where npm.cmd >nul 2>nul
if errorlevel 1 goto :missing_node

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR goto :missing_node
if %NODE_MAJOR% LSS 20 goto :old_node

if not exist "node_modules\.bin\tsx.cmd" (
  echo First start detected. Installing Ashen Reach dependencies...
  echo This can take a few minutes.
  echo.
  call npm.cmd install
  if errorlevel 1 goto :install_failed
  echo.
)

echo Starting the game server and Host TV...
echo The TV will open automatically when Ashen Reach is ready.
echo Closing this command window will also stop the game server.
echo.

set "ASHEN_REACH_LAUNCHER_PID="
for /f "usebackq delims=" %%P in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\get-parent-process-id.ps1" 2^>nul`) do (
  if not defined ASHEN_REACH_LAUNCHER_PID set "ASHEN_REACH_LAUNCHER_PID=%%P"
)

call npm.cmd run dev -- --open-tv
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo Ashen Reach has stopped.
) else (
  echo Ashen Reach stopped with error code %EXIT_CODE%.
  echo Review the messages above for the cause.
)
echo.
pause
exit /b %EXIT_CODE%

:already_running
echo Ashen Reach is already running.
echo Opening the existing Host TV on port %RUNNING_PORT%...
echo.
start "" "http://127.0.0.1:%RUNNING_PORT%/tv"
exit /b 0

:missing_node
echo Node.js 20 or newer was not found.
echo.
echo Install the current Node.js LTS release from:
echo https://nodejs.org/
echo.
pause
exit /b 1

:old_node
echo Ashen Reach requires Node.js 20 or newer.
echo Installed Node.js major version: %NODE_MAJOR%
echo.
echo Install the current Node.js LTS release from:
echo https://nodejs.org/
echo.
pause
exit /b 1

:install_failed
echo.
echo Dependency installation failed.
echo Check the npm error above, then run this file again.
echo.
pause
exit /b 1
