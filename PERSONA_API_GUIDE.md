# 🎭 Fairness Chatbot - Personas API Guide

Transform your applications with **ethical AI personas**! Export our fairness-trained personas and use them in your own projects via API.

## 🚀 **What You Can Do**

✅ **Export persona configurations** in multiple formats  
✅ **Get API keys** for your applications  
✅ **Access the full AI model** (Llama 3.1 8B)  
✅ **Use as an AI agent** in any programming language  
✅ **Demographics-aware responses**  
✅ **Built-in fairness training**  

## 📋 **Quick Start**

### **1. Generate API Key**

```bash
curl -X POST "http://localhost:8002/api-keys/generate" \
     -H "Content-Type: application/json" \
     -d '{"user_id": "your-user-id", "name": "My Project", "persona_id": "fitness-trainer"}'
```

**Important:** You must specify a `persona_id` when generating an API key. Each key is permanently linked to one persona.

**Response:**
```json
{
  "api_key": "pk_fairness_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "message": "API key generated successfully",
  "documentation": "http://localhost:8002/docs",
  "rate_limit": "100 requests per hour"
}
```

### **2. List Available Personas**

```bash
curl -X GET "http://localhost:8002/personas" \
     -H "Authorization: Bearer pk_fairness_your_api_key"
```

### **3. Chat with a Persona**

```bash
curl -X POST "http://localhost:8002/chat" \
     -H "Authorization: Bearer pk_fairness_your_api_key" \
     -H "Content-Type: application/json" \
     -d '{
       "message": "I want to start exercising",
       "user_demographics": {"age": "25", "role": "student"}
     }'
```

**Note:** Your API key is automatically linked to a specific persona when generated, so you don't need to include `persona_id` in your requests.

## 🔧 **Integration Examples**

### **Python Example**

```python
import requests

class FairnessChatbot:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "http://localhost:8002"
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    def chat(self, message, user_demographics=None):
        response = requests.post(
            f"{self.base_url}/chat",
            headers=self.headers,
            json={
                "message": message,
                "user_demographics": user_demographics
            }
        )
        return response.json()
    
    def get_personas(self):
        response = requests.get(f"{self.base_url}/personas", headers=self.headers)
        return response.json()

# Usage
# Note: Your API key is linked to a specific persona when generated
bot = FairnessChatbot("pk_fairness_your_api_key")

# Chat with the persona linked to your API key
response = bot.chat(
    message="How do I lose weight?",
    user_demographics={"age": "30", "gender": "female", "role": "professional"}
)

print(response["response"])
# Output: "Hey there! 💪 Great question! Weight loss is all about creating a sustainable calorie deficit..."
```

### **JavaScript/Node.js Example**

```javascript
class FairnessChatbot {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'http://localhost:8002';
    }
    
    async chat(message, userDemographics = null) {
        const response = await fetch(`${this.baseURL}/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                user_demographics: userDemographics
            })
        });
        return await response.json();
    }
}

// Usage
// Note: Your API key is linked to a specific persona when generated
const bot = new FairnessChatbot('pk_fairness_your_api_key');

const response = await bot.chat(
    "I need help with my hotel booking",
    { age: "45", role: "business" }
);

console.log(response.response);
```

### **React Component Example**

```jsx
import React, { useState } from 'react';

const FairnessChat = ({ apiKey }) => {
    const [message, setMessage] = useState('');
    const [response, setResponse] = useState('');
    
    const sendMessage = async () => {
        const result = await fetch('http://localhost:8002/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                user_demographics: { age: "25", role: "student" }
            })
        });
        
        const data = await result.json();
        setResponse(data.response);
    };
    
    return (
        <div>
            <input 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
            />
            
            <button onClick={sendMessage}>Send</button>
            
            {response && <div className="response">{response}</div>}
        </div>
    );
};
```

## 📤 **Export Formats**

### **JSON Export**

```bash
curl -X POST "http://localhost:8002/personas/fitness-trainer/export" \
     -H "Authorization: Bearer pk_fairness_your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"format": "json", "include_model": true}'
```

**Response:**
```json
{
  "persona": {
    "id": "fitness-trainer",
    "name": "Fitness Trainer",
    "system_prompt": "You are a professional fitness trainer...",
    "demographics_adaptation": {
      "young": "Use casual, relatable language",
      "professional": "Focus on efficient solutions",
      "senior": "Emphasize safety and low-impact"
    }
  },
  "usage_guide": {
    "api_endpoint": "http://localhost:8002/chat",
    "headers": {"Authorization": "Bearer your_key"},
    "example_request": {
      "message": "Hello!",
      "user_demographics": {"age": "25", "role": "student"}
    }
  },
  "model_info": {
    "base_model": "llama3.1:8b-instruct-q4_0",
    "fairness_training": true,
    "memory_usage": "~4.7GB",
    "response_time": "2-5 seconds"
  }
}
```

### **OpenAI GPT Format**

```bash
curl -X POST "http://localhost:8002/personas/fitness-trainer/export" \
     -H "Authorization: Bearer pk_fairness_your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"format": "openai-gpt"}'
```

Perfect for migrating to/from OpenAI models!

## 🎯 **Use Cases**

### **1. Customer Service Bots**
```python
# Hotel booking system (API key linked to hotel-receptionist persona)
response = bot.chat(
    "I want to cancel my reservation", 
    user_demographics={"age": "50", "role": "business"}
)
```

### **2. Health & Fitness Apps**
```python
# Fitness coaching app (API key linked to fitness-trainer persona)
response = bot.chat(
    "Create a workout plan for me",
    user_demographics={"age": "22", "gender": "female"}
)
```

### **3. Educational Platforms**
```python
# Learning management system (API key linked to teacher persona)
response = bot.chat(
    "Explain machine learning simply",
    user_demographics={"age": "16", "role": "student"}
)
```

### **4. E-commerce**
```python
# Product recommendation system (API key linked to sales-assistant persona)
response = bot.chat(
    "I need a laptop for gaming",
    user_demographics={"age": "28", "role": "gamer"}
)
```

**Note:** Each API key is linked to a specific persona when generated. To use different personas, generate separate API keys for each one.

## 📊 **API Endpoints Reference**

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api-keys/generate` | POST | Generate new API key |
| `/personas` | GET | List all personas |
| `/personas/{id}` | GET | Get specific persona |
| `/personas/{id}/export` | POST | Export persona configuration |
| `/chat` | POST | Chat with personas |
| `/usage` | GET | Check API usage stats |

## 🔐 **Authentication & Security**

- **API Key Format:** `pk_fairness_[32_char_hash]`
- **Rate Limiting:** 100 requests per hour per key
- **Authentication:** Bearer token in Authorization header
- **HTTPS:** Use HTTPS in production

## 💰 **Pricing (Example)**

| Plan | Requests/Month | Price | Features |
|------|---------------|-------|----------|
| **Free** | 1,000 | $0 | Basic personas, standard support |
| **Pro** | 10,000 | $29 | All personas, priority support |
| **Enterprise** | Unlimited | $199 | Custom personas, dedicated support |

## 🚀 **Getting Started**

1. **Start the API server:**
   ```bash
   python persona_export_api.py
   ```

2. **Visit the documentation:**
   http://localhost:8002/docs

3. **Generate your first API key**

4. **Start building!**

## 🎉 **Benefits**

✅ **Ethical AI** - Built-in fairness training  
✅ **Memory Efficient** - Only 4.7GB RAM usage  
✅ **Demographics Aware** - Adapts to user context  
✅ **Multiple Personas** - Hotel, fitness, medical, etc.  
✅ **Easy Integration** - RESTful API in any language  
✅ **Production Ready** - Rate limiting, auth, monitoring  

---

**Ready to add ethical AI personas to your applications?** 🚀  
Start with the API documentation: http://localhost:8002/docs 