@echo off
setlocal

cd /d "%~dp0"

title Ashen Reach Dev
echo Starting Ashen Reach local dev server...
echo.

call npm run dev
set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Ashen Reach dev startup exited with code %EXIT_CODE%.
  echo Make sure Node.js dependencies are installed with `npm install`.
  pause
)

endlocal
