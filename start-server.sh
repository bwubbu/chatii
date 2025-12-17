#!/bin/bash
set -e

# Start Ollama in background
echo "🚀 Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready (Cloud Run needs this to be reliable)
echo "⏳ Waiting for Ollama to start..."
for i in {1..30}; do
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Ollama failed to start after 30 seconds"
    exit 1
  fi
  sleep 1
done

# Pull the model (use environment variable or default to 8B model)
MODEL=${MODEL:-llama3.1:8b-instruct-q4_0}
echo "📥 Pulling model $MODEL..."
ollama pull $MODEL || {
  echo "⚠️  Model pull failed, trying fallback..."
  ollama pull llama3.1:8b-instruct-q4_0 || echo "❌ Failed to pull model"
}

# Verify Ollama is still running
if ! kill -0 $OLLAMA_PID 2>/dev/null; then
  echo "❌ Ollama process died!"
  exit 1
fi

# Start FastAPI server (Cloud Run sets PORT automatically)
PORT=${PORT:-8080}
echo "🌐 Starting FastAPI server on port $PORT with model $MODEL..."
exec python ollama_chatbot_server.py --host 0.0.0.0 --port $PORT --model $MODEL
