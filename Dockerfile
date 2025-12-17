# Use Python 3.11 slim image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements-server.txt .
RUN pip install --no-cache-dir -r requirements-server.txt

# Copy the FastAPI server
COPY ollama_chatbot_server.py .

# Expose port
EXPOSE 8000

# Copy startup script
COPY start-server.sh .
RUN chmod +x start-server.sh

# Start the server
CMD ["./start-server.sh"]
