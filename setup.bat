@echo off
REM Quick setup script for DeepFake Project

echo ======================================
echo DeepFake Project - Quick Setup
echo ======================================

REM Check if detection venv exists
if not exist "detection\venv_detection\Scripts\activate.bat" (
    echo Creating detection virtual environment...
    cd detection
    python -m venv venv_detection
    call venv_detection\Scripts\activate.bat
    echo Installing detection dependencies...
    pip install tensorflow scikit-learn opencv-python numpy
    cd ..
) else (
    echo Detection venv already exists
)

REM Check if generation venv exists
if not exist "generation\venv_generation\Scripts\activate.bat" (
    echo Creating generation virtual environment...
    cd generation
    python -m venv venv_generation
    call venv_generation\Scripts\activate.bat
    echo Installing generation dependencies...
    pip install -r roop\requirements.txt
    cd ..
) else (
    echo Generation venv already exists
)

REM Install backend dependencies
echo.
echo Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo ======================================
echo Setup Complete!
echo ======================================
echo.
echo Next Steps:
echo 1. Create data directories:
echo    - detection/data/real/
echo    - detection/data/fake/
echo.
echo 2. Add video files to those directories
echo.
echo 3. Train the model:
echo    cd detection
echo    .\venv_detection\Scripts\activate.bat
echo    python train_fast.py
echo.
echo 4. Start the backend:
echo    cd backend
echo    node server.js
echo.
echo 5. Start the frontend:
echo    cd frontend
echo    npm start
echo.
pause
