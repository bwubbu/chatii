# 🤖 Fairness Chatbot - AI Assistant with Ethical Training

A Next.js chatbot application featuring fairness-trained AI models with memory-efficient inference using Ollama. Built with React, TypeScript, FastAPI, and Supabase.

![Chatbot Interface](public/placeholder.svg)

## ✨ Features

- 🎯 **Fairness-trained AI models** - Promotes respectful and unbiased conversations
- 💾 **Memory-efficient inference** - Uses quantized models to reduce RAM usage by 66%
- 🚀 **Multiple AI backends** - Choose between Fairness Model (Ollama) and Gemini
- 👥 **Persona-based conversations** - Different AI personalities for various use cases
- 📊 **Analytics & feedback** - Collect user demographics and conversation feedback
- 🎨 **Modern UI** - Beautiful, responsive design with dark theme
- 🔒 **User authentication** - Secure login/signup with Supabase
- 💬 **Real-time chat** - Smooth conversation experience with typing animations

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python), Ollama
- **Database:** Supabase (PostgreSQL)
- **AI Models:** Llama 3.1 8B (quantized), Google Gemini
- **Authentication:** Supabase Auth

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://python.org/)
- **Ollama** - [Download here](https://ollama.com/)
- **Git** - [Download here](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd chatii
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API (optional)
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Start the Application

**Option A: Automatic Start (Windows)**
```bash
start_fairness_chatbot.bat
```

**Option B: Manual Start**

Open 3 terminals and run:

```bash
# Terminal 1: Start Ollama server
ollama serve

# Terminal 2: Start FastAPI backend
python ollama_chatbot_server.py --model llama3.1:8b-instruct-q4_0

# Terminal 3: Start Next.js frontend
npm run dev
```

### 5. Access the Application

- **Frontend:** http://localhost:3000
- **API Documentation:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

## 🎮 How to Use

### Starting a Conversation

1. **Sign up/Login** at http://localhost:3000
2. **Choose a persona** from the available options
3. **Select AI model:**
   - **Fairness Model** - Memory-efficient, ethics-focused
   - **Gemini** - Google's powerful language model
4. **Start chatting!**

### Available Personas

- **Hotel Receptionist** - Helpful hospitality assistant
- **Fitness Trainer** - Health and wellness guide
- **Food Waiter** - Restaurant service expert
- **Medical Guidance Robot** - Healthcare information assistant
- **Sales Assistant** - Product recommendation specialist
- And more...

### Model Comparison

| Feature | Fairness Model (Ollama) | Gemini |
|---------|------------------------|---------|
| **Memory Usage** | ~4.7GB | API-based |
| **Response Time** | Fast (local) | Moderate (API) |
| **Specialization** | Fairness & Ethics | General Purpose |
| **Cost** | Free | API costs |
| **Privacy** | Local inference | Cloud-based |

## 🔧 Configuration

### Ollama Model Configuration

The default model is `llama3.1:8b-instruct-q4_0`. To use a different model:

```bash
# Pull a different model
ollama pull mistral:7b-instruct-q4_0

# Start server with different model
python ollama_chatbot_server.py --model mistral:7b-instruct-q4_0
```

### System Requirements

- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 10GB for models and dependencies
- **CPU:** Modern multi-core processor recommended

## 🐛 Troubleshooting

### Common Issues

**1. "Ollama not found" error**
```bash
# Check if Ollama is installed
ollama --version

# If not installed, download from https://ollama.com/
```

**2. "Model not found" error**
```bash
# Pull the required model
ollama pull llama3.1:8b-instruct-q4_0
```

**3. High memory usage**
```bash
# Use a smaller quantized model
ollama pull llama3.1:8b-instruct-q2_K
python ollama_chatbot_server.py --model llama3.1:8b-instruct-q2_K
```

**4. FastAPI server not starting**
```bash
# Check if port 8000 is available
netstat -an | findstr :8000

# Use a different port
python ollama_chatbot_server.py --port 8001
```

**5. Next.js build errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Testing the Integration

Run the test script to verify everything is working:

```bash
python test_integration.py
```

## 📁 Project Structure

```
chatii/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── trained-model/        # Ollama FastAPI integration
│   │   ├── gemini-chat/          # Google Gemini integration
│   │   └── ...
│   ├── chat/                     # Chat interface pages
│   ├── admin/                    # Admin dashboard
│   └── ...
├── components/                   # React components
│   ├── chat/                     # Chat-related components
│   ├── ui/                       # UI primitives
│   └── ...
├── fine_tuning/                  # ML training scripts
│   ├── data/                     # Training datasets
│   ├── scripts/                  # Training and inference scripts
│   └── notebooks/                # Jupyter notebooks
├── Lora Model/                   # Trained model adapters
├── supabase/                     # Database migrations
├── ollama_chatbot_server.py      # FastAPI backend server
├── start_fairness_chatbot.bat    # Windows startup script
└── test_integration.py           # Integration tests
```

## 🎯 Development

### Adding New Personas

1. Create persona data in Supabase `personas` table
2. Add persona-specific system prompts
3. Update the personas page to display new options

### Training Custom Models

See `fine_tuning/README.md` for detailed instructions on:
- Data preparation
- Model fine-tuning with Unsloth
- LoRA adapter creation
- Model evaluation

### API Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/trained-model` | POST | Chat with fairness model |
| `/api/gemini-chat` | POST | Chat with Gemini |
| `/health` | GET | Health check |
| `/docs` | GET | API documentation |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama** - For making local LLM inference accessible
- **Unsloth** - For efficient model fine-tuning
- **Supabase** - For the amazing backend-as-a-service
- **Next.js** - For the powerful React framework
- **FastAPI** - For the high-performance API framework

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Run `python test_integration.py` to verify setup
3. Open an issue on GitHub
4. Check the API documentation at http://localhost:8000/docs

---

**Happy chatting! 🎉**

Made with ❤️ for ethical AI conversations.