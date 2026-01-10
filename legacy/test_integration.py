#!/usr/bin/env python3
"""
Test script to verify the integration between Next.js API and Ollama FastAPI server
"""

import requests
import json
import time

def test_ollama_server():
    """Test the Ollama FastAPI server directly"""
    print("🧪 Testing Ollama FastAPI server...")
    
    try:
        # Test health endpoint
        health_response = requests.get("http://localhost:8000/health", timeout=5)
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"✅ Health check passed - Model: {health_data['model']}")
        else:
            print(f"❌ Health check failed - Status: {health_response.status_code}")
            return False
        
        # Test chat endpoint
        chat_request = {
            "message": "How should I treat people from different backgrounds?",
            "max_tokens": 100,
            "temperature": 0.7
        }
        
        print("📤 Sending test message...")
        chat_response = requests.post(
            "http://localhost:8000/chat",
            json=chat_request,
            timeout=30
        )
        
        if chat_response.status_code == 200:
            chat_data = chat_response.json()
            print("✅ Chat endpoint working!")
            print(f"🤖 Response: {chat_data['response'][:100]}...")
            print(f"📊 Model: {chat_data['model']}")
            return True
        else:
            print(f"❌ Chat endpoint failed - Status: {chat_response.status_code}")
            print(f"Error: {chat_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Ollama server. Is it running on port 8000?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_nextjs_api():
    """Test the Next.js API route"""
    print("\n🧪 Testing Next.js API route...")
    
    try:
        # Test the trained-model endpoint
        api_request = {
            "message": "How can I ensure fair treatment of all employees?",
            "persona": "HR Manager",
            "temperature": 0.7,
            "max_length": 150
        }
        
        print("📤 Sending request to Next.js API...")
        api_response = requests.post(
            "http://localhost:3000/api/trained-model",
            json=api_request,
            timeout=45
        )
        
        if api_response.status_code == 200:
            api_data = api_response.json()
            print("✅ Next.js API working!")
            print(f"🤖 Response: {api_data['response'][:100]}...")
            print(f"📊 Model: {api_data['model']}")
            print(f"⚡ Processing time: {api_data['processing_time_ms']}ms")
            print(f"🛡️ Fairness enabled: {api_data['fairness_enabled']}")
            return True
        else:
            print(f"❌ Next.js API failed - Status: {api_response.status_code}")
            print(f"Error: {api_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Next.js server. Is it running on port 3000?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🚀 Testing Ollama + Next.js Integration\n")
    
    # Test Ollama server first
    ollama_ok = test_ollama_server()
    
    if not ollama_ok:
        print("\n❌ Ollama server test failed. Please start the server with:")
        print("   python ollama_chatbot_server.py --model llama3.1:8b-instruct-q4_0")
        return
    
    # Wait a moment
    time.sleep(1)
    
    # Test Next.js API
    nextjs_ok = test_nextjs_api()
    
    if not nextjs_ok:
        print("\n❌ Next.js API test failed. Please start the server with:")
        print("   npm run dev")
        return
    
    print("\n🎉 All tests passed! Integration is working correctly!")
    print("\n📝 Next steps:")
    print("1. Open http://localhost:3000 in your browser")
    print("2. Go to the chat interface")
    print("3. Select 'Fairness Model' in the model toggle")
    print("4. Test with fairness-related questions")
    
    print("\n💡 Example test questions:")
    print("- How should I treat people from different backgrounds?")
    print("- What does fair treatment mean in the workplace?")
    print("- How can I be more inclusive in my interactions?")

if __name__ == "__main__":
    main() 