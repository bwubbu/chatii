#!/bin/bash
set -e

# Start Ollama in background
echo "🚀 Starting Ollama server..."
ollama serve &

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to start..."
sleep 10

# Pull the model (if not already cached)
echo "📥 Pulling model llama3.1:8b-instruct-q4_0..."
ollama pull llama3.1:8b-instruct-q4_0 || echo "⚠️  Model pull failed or already exists"

# Start FastAPI server
PORT=${PORT:-8000}
echo "🌐 Starting FastAPI server on port $PORT..."
python ollama_chatbot_server.py --host 0.0.0.0 --port $PORT --model llama3.1:8b-instruct-q4_0
