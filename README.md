# 🤖 Fairness Chatbot - AI Assistant with RAG-Enhanced Responses

A Next.js chatbot application featuring Vertex AI Llama models with RAG (Retrieval Augmented Generation) for culturally-aware, fair, and polite responses. Built with React, TypeScript, and Supabase.

![Chatbot Interface](public/placeholder.svg)

## ✨ Features

- 🎯 **RAG-Enhanced AI** - Uses Vertex AI Llama models with RAG for culturally-aware responses
- 🧠 **Knowledge Retrieval** - Retrieves relevant guidelines, cultural context, and examples
- 🚀 **Multiple AI backends** - Choose between Vertex AI Llama 3 and Gemini
- 👥 **Persona-based conversations** - Different AI personalities for various use cases
- 📊 **Analytics & feedback** - Collect user demographics and conversation feedback
- 🎨 **Modern UI** - Beautiful, responsive design with dark theme
- 🔒 **User authentication** - Secure login/signup with Supabase
- 💬 **Real-time chat** - Smooth conversation experience with typing animations

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL with pgvector)
- **AI Models:** Vertex AI Llama 3 (managed), Google Gemini (fallback)
- **RAG System:** Vector embeddings (OpenAI/Cohere) with semantic search
- **Authentication:** Supabase Auth

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Google Cloud Project** with Vertex AI API enabled
- **Supabase Account** for database and authentication

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
# or
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Primary LLM Configuration (Optional)
# Set to "gemini" (default) or "vertex-ai" to choose which model to use first
# The other model will be used as fallback if the primary fails
PRIMARY_LLM=gemini

# Google Gemini API (Required if using Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Google Cloud Vertex AI Configuration (Required if using Vertex AI)
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_AI_MODEL=llama-3-8b-instruct
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# OpenAI API (for embeddings)
OPENAI_API_KEY=your_openai_api_key

# Cohere API (optional, for embeddings alternative)
COHERE_API_KEY=your_cohere_api_key
```

### 4. Set Up Google Cloud

**For Gemini (Primary - Recommended):**
1. Get a **Gemini API key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set `GEMINI_API_KEY` in your `.env.local` file

**For Vertex AI (Optional Fallback):**
1. **Enable Vertex AI API** in your GCP project
2. **Create a service account** with Vertex AI User role
3. **Download service account key** as JSON
4. **Set `GOOGLE_APPLICATION_CREDENTIALS_JSON`** to the full JSON content (or use Application Default Credentials for local dev)
5. **Accept Llama model license** in [Vertex AI Model Garden](https://console.cloud.google.com/vertex-ai/publishers/google/model-garden)

**Note:** You can configure which model to use as primary by setting `PRIMARY_LLM=gemini` (default) or `PRIMARY_LLM=vertex-ai` in your `.env.local` file. The other model will automatically be used as a fallback if the primary fails.

### 5. Start the Application

```bash
npm run dev
# or
pnpm dev
```

### 6. Access the Application

- **Frontend:** http://localhost:3000

## 🎮 How to Use

### Starting a Conversation

1. **Sign up/Login** at http://localhost:3000
2. **Choose a persona** from the available options
3. **Select AI model:**
   - The system uses either **Gemini** or **Vertex AI Llama 3** as primary (configurable via `PRIMARY_LLM` env variable)
   - The other model is automatically used as fallback if the primary fails
   - Default: Gemini (simpler setup)
4. **Start chatting!**

### Available Personas

- **Hotel Receptionist** - Helpful hospitality assistant
- **Fitness Trainer** - Health and wellness guide
- **Food Waiter** - Restaurant service expert
- **Medical Guidance Robot** - Healthcare information assistant
- **Sales Assistant** - Product recommendation specialist
- And more...

### Primary LLM Configuration

You can choose which model to use as primary by setting the `PRIMARY_LLM` environment variable:

```env
# Use Gemini as primary (default - simpler setup)
PRIMARY_LLM=gemini

# Or use Vertex AI as primary (better for production)
PRIMARY_LLM=vertex-ai
```

The other model will automatically be used as a fallback if the primary fails.

### Model Comparison

| Feature | Gemini | Vertex AI Llama 3 |
|---------|--------|-------------------|
| **Infrastructure** | API-based | Fully managed |
| **Response Time** | Fast | Fast (managed) |
| **Setup Complexity** | Simple (API key only) | Complex (requires license acceptance) |
| **Specialization** | General Purpose | General purpose with RAG |
| **Cost** | API costs | Pay-per-use |
| **RAG Support** | Yes (via system prompt) | Yes (via system prompt) |
| **Best For** | Development, quick setup | Production, enterprise use |

## 🔧 Configuration

### Vertex AI Model Configuration

The default model is `llama-3-8b-instruct`. To use a different model, set the `VERTEX_AI_MODEL` environment variable:

```env
VERTEX_AI_MODEL=llama-3-70b-instruct  # For larger model
# or
VERTEX_AI_MODEL=llama-3.3-70b-instruct  # For Llama 3.3
```

Available models in Vertex AI Model Garden:
- `llama-3-8b-instruct` (default)
- `llama-3-70b-instruct`
- `llama-3.3-70b-instruct`
- `llama-4-maverick` (when available)

### System Requirements

- **Node.js:** v18 or higher
- **Google Cloud Project** with Vertex AI API enabled
- **Supabase Account** for database

## 🐛 Troubleshooting

### Common Issues

**1. "Vertex AI authentication failed" error**
- Ensure `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set with valid service account JSON
- Or configure Application Default Credentials for local development
- Verify the service account has Vertex AI User role

**2. "GOOGLE_CLOUD_PROJECT_ID not set" error**
- Set `GOOGLE_CLOUD_PROJECT_ID` environment variable
- Ensure Vertex AI API is enabled in your GCP project

**3. "Model not found" error (Vertex AI)**
- **Most common cause:** License not accepted in Vertex AI Model Garden
  - Go to: https://console.cloud.google.com/vertex-ai/model-garden
  - Search for "llama" → Click "Llama 3 8B Instruct" → Click "Accept"
  - Wait 2-5 minutes for access to be granted
- Verify the model name in `VERTEX_AI_MODEL` matches available models
  - ✅ Correct: `llama-3-8b-instruct` (dash, not dot)
  - ❌ Wrong: `llama-3.1-8b-instruct`
- Ensure the model is available in your selected region (`GOOGLE_CLOUD_LOCATION`)
- **Run verification script:** `node scripts/verify-vertex-ai-setup.js`
- **Quick fix:** Switch to Gemini as primary: `PRIMARY_LLM=gemini` in `.env.local`

**4. Switching between models for troubleshooting**
- To use Gemini as primary: `PRIMARY_LLM=gemini` (default)
- To use Vertex AI as primary: `PRIMARY_LLM=vertex-ai`
- The system will automatically fallback to the other model if the primary fails
- Check logs to see which model was used: `server_type` in the response indicates `gemini`, `vertex-ai`, `gemini-fallback`, or `vertex-ai-fallback`

**4. "google-auth-library not found" error**
```bash
# Install the required package
npm install google-auth-library
# or
pnpm add google-auth-library
```

**5. Next.js build errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Testing the Integration

The application uses Vertex AI for LLM inference. Verify the connection by:
1. Testing the chat interface
2. Checking browser console for Vertex AI API calls
3. Verifying environment variables are set correctly

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
├── ollama_chatbot_server.py      # FastAPI backend server (for local dev)
├── legacy/                       # Legacy/unused files
│   ├── fairness_model_server_fastapi.py
│   ├── persona_export_api.py
│   ├── convert_lora_to_ollama.py
│   ├── test_integration.py
│   ├── test_persona_behavior.py
│   └── start_fairness_chatbot.bat
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
| `/api/trained-model` | POST | Chat with Vertex AI Llama 3 |
| `/api/gemini-chat` | POST | Chat with Gemini (fallback) |
| `/api/rag/retrieve` | POST | Retrieve RAG guidelines |
| `/api/rag/retrieve-combined` | POST | Retrieve guidelines, book sections, and negative examples |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Vertex AI** - For managed Llama models and infrastructure
- **Supabase** - For the amazing backend-as-a-service with pgvector
- **Next.js** - For the powerful React framework
- **OpenAI/Cohere** - For embedding generation
- **Google Gemini** - For fallback LLM support

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Verify your Vertex AI environment variables are set correctly
3. Ensure Vertex AI API is enabled in your GCP project
4. Check that you've accepted the Llama model license in Vertex AI Model Garden
5. Open an issue on GitHub

---

**Happy chatting! 🎉**

Made with ❤️ for ethical AI conversations.