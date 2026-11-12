@echo off
setlocal
cd /d "%~dp0"
if not exist .tmp mkdir .tmp
set "TEMP=%~dp0.tmp"
set "TMP=%~dp0.tmp"
set "PYTHON_EXE=C:\laragon\bin\python\python-3.13\python.exe"
if not exist "%PYTHON_EXE%" (
  where py >nul 2>nul
  if errorlevel 1 (
    echo Laragon Python was not found. Install Python 3.13 or 3.11 first.
    pause
    exit /b 1
  )
  py -3.13 --version >nul 2>nul
  if not errorlevel 1 (set "PYTHON_EXE=py -3.13") else (set "PYTHON_EXE=py -3.11")
)
if exist .venv\Scripts\python.exe (
  .venv\Scripts\python.exe -m pip --version >nul 2>nul
  if not errorlevel 1 goto venv_ready
)
%PYTHON_EXE% -m venv --clear .venv
if errorlevel 1 (
  echo Could not create the virtual environment. Python 3.13 or 3.11 is recommended.
  pause
  exit /b 1
)
:venv_ready
.venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 exit /b 1
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 exit /b 1
echo Downloading the multilingual Large-v3 model once into asr\models. This is a large download.
.venv\Scripts\python.exe -c "from huggingface_hub import snapshot_download; snapshot_download('Systran/faster-whisper-large-v3', local_dir='models/faster-whisper-large-v3')"
if errorlevel 1 (
  echo Model download failed. Check disk space and internet, then run install.bat again.
  pause
  exit /b 1
)
.venv\Scripts\python.exe -c "from faster_whisper import WhisperModel; WhisperModel('models/faster-whisper-large-v3', device='cpu', compute_type='int8')"
if errorlevel 1 exit /b 1
echo Local model installed. After this setup, transcription runs offline.
pause
