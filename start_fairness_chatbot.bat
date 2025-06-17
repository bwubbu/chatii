@echo off
echo 🚀 Starting Fairness ChatBot System...
echo.

echo 📡 Starting FastAPI Model Server...
start "Fairness Model Server" cmd /k "python fairness_model_server_fastapi.py"

echo ⏳ Waiting for model server to start...
timeout /t 10 /nobreak > nul

echo 🌐 Starting Next.js Development Server...
start "Next.js App" cmd /k "npm run dev"

echo.
echo ✅ Both servers are starting!
echo.
echo 📡 FastAPI Server: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo 🌐 Next.js App: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul 