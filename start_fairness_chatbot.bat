@echo off
echo 🚀 Starting Fairness Chatbot with Ollama Integration
echo.

REM Check if Ollama is installed
where ollama >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Ollama is not installed or not in PATH
    echo Please install Ollama from https://ollama.com/
    pause
    exit /b 1
)

REM Check if the required model is available
echo 📦 Checking for Llama 3.1 model...
ollama list | findstr /i "llama3.1:8b-instruct-q4_0" >nul
if %ERRORLEVEL% NEQ 0 (
    echo 📥 Downloading Llama 3.1 model (this may take a few minutes)...
    ollama pull llama3.1:8b-instruct-q4_0
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to download model
        pause
        exit /b 1
    )
)

echo ✅ Model ready!
echo.

REM Start Ollama server in background
echo 🔧 Starting Ollama server...
start /b ollama serve >nul 2>nul

REM Wait for Ollama to start
timeout /t 3 /nobreak >nul

REM Start FastAPI server in new window
echo 🤖 Starting FastAPI server...
start "Fairness ChatBot API" cmd /k "python ollama_chatbot_server.py --model llama3.1:8b-instruct-q4_0 --port 8000"

REM Wait for FastAPI server to start
echo ⏳ Waiting for FastAPI server to start...
timeout /t 5 /nobreak >nul

REM Start Next.js development server in new window
echo 🌐 Starting Next.js development server...
start "Next.js Dev Server" cmd /k "npm run dev"

echo.
echo 🎉 All servers are starting up!
echo.
echo 📝 What's running:
echo   • Ollama Server: Background process
echo   • FastAPI Server: http://localhost:8000 (new window)
echo   • Next.js Server: http://localhost:3000 (new window)
echo.
echo 📚 FastAPI Docs: http://localhost:8000/docs
echo 🌐 Chat App: http://localhost:3000
echo.
echo ⏳ Please wait ~30 seconds for all servers to fully start...
echo Then open http://localhost:3000 in your browser
echo.
echo 💡 To test the integration, run: python test_integration.py
echo.
pause 