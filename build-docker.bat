@echo off
REM Docker Build Script for Windows
REM Usage: build-docker.bat [image-name] [tag]

set IMAGE_NAME=%~1
set TAG=%~2

if "%IMAGE_NAME%"=="" set IMAGE_NAME=chatii-app
if "%TAG%"=="" set TAG=latest

echo 🐳 Building Docker image: %IMAGE_NAME%:%TAG%

REM Check if Dockerfile folder exists and build accordingly
if exist "Dockerfile\" (
    echo 📁 Using Dockerfile from Dockerfile/ folder
    docker build -f Dockerfile/Dockerfile -t %IMAGE_NAME%:%TAG% .
) else if exist "Dockerfile" (
    echo 📄 Using Dockerfile from root
    docker build -t %IMAGE_NAME%:%TAG% .
) else (
    echo ❌ Error: Dockerfile not found!
    exit /b 1
)

if %ERRORLEVEL% EQU 0 (
    echo ✅ Build successful!
    echo 🚀 To run: docker run -p 5000:5000 %IMAGE_NAME%:%TAG%
) else (
    echo ❌ Build failed!
    exit /b 1
)
