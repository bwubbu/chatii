# Docker Build Script for Windows
# This script handles the Windows limitation where you can't have both
# a Dockerfile file and Dockerfile folder with the same name

param(
    [string]$ImageName = "chatii-app",
    [string]$Tag = "latest"
)

Write-Host "🐳 Building Docker image: $ImageName:$Tag" -ForegroundColor Cyan

# Check if Dockerfile folder exists
if (Test-Path "Dockerfile" -PathType Container) {
    Write-Host "📁 Using Dockerfile from Dockerfile/ folder" -ForegroundColor Yellow
    docker build -f Dockerfile/Dockerfile -t "$ImageName`:$Tag" .
} elseif (Test-Path "Dockerfile" -PathType Leaf) {
    Write-Host "📄 Using Dockerfile from root" -ForegroundColor Yellow
    docker build -t "$ImageName`:$Tag" .
} else {
    Write-Host "❌ Error: Dockerfile not found!" -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host "🚀 To run: docker run -p 5000:5000 $ImageName`:$Tag" -ForegroundColor Cyan
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
