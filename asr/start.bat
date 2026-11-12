@echo off
setlocal
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo Run install.bat first to install the local model.
  pause
  exit /b 1
)
.venv\Scripts\python.exe -c "import flask, faster_whisper" >nul 2>nul
if errorlevel 1 (
  echo Python packages are missing. Run install.bat first.
  pause
  exit /b 1
)
if not exist models\faster-whisper-large-v3\model.bin (
  echo The Large-v3 model weights are missing. Run install.bat and wait for it to finish.
  pause
  exit /b 1
)
echo Loading local Whisper model. The first startup may take a minute.
.venv\Scripts\python.exe server.py
pause
