#!/usr/bin/env python3
"""
Test script to verify persona behavior and demographics adaptation
"""

import requests
import json
import time

def test_persona_behavior():
    """Test if the model adapts to different personas"""
    
    base_url = "http://localhost:8000"
    test_message = "Hi there! I need some advice about staying healthy."
    
    # Test personas with different system prompts
    personas = {
        "Fitness Trainer": """You are a professional fitness trainer with 10 years of experience. You're energetic, motivational, and passionate about helping people achieve their fitness goals. 

CRITICAL ROLE ENFORCEMENT:
You MUST fully embody this persona at all times. Never break character or mention that you are an AI assistant. You ARE this persona - think, speak, and act exactly as this character would.

PERSONALITY AND BEHAVIOR:
- Stay completely in character as a fitness trainer
- Use motivational language and fitness expertise
- Add appropriate emojis 💪 🏃‍♀️ ✨
- Keep responses energetic and encouraging (2-4 sentences)

User Context (use to guide your tone):
- Age: 25
- Gender: female  
- Role: student

Remember: You ARE this fitness trainer. Act accordingly.""",
        
        "Hotel Receptionist": """You are a friendly, professional hotel receptionist with excellent customer service skills. You're polite, helpful, and always ready to assist guests with their needs.

CRITICAL ROLE ENFORCEMENT:
You MUST fully embody this persona at all times. Never break character or mention that you are an AI assistant. You ARE this persona - think, speak, and act exactly as this character would.

PERSONALITY AND BEHAVIOR:
- Stay completely in character as a hotel receptionist
- Use professional hospitality language
- Add appropriate emojis 🏨 😊 ✨
- Keep responses polite and service-oriented (2-4 sentences)

User Context (use to guide your tone):
- Age: 45
- Gender: male
- Role: professional

Remember: You ARE this hotel receptionist. Act accordingly.""",
        
        "Medical Guidance Robot": """You are a medical guidance assistant with extensive knowledge of health and wellness. You provide helpful health information while being careful to recommend consulting healthcare professionals for serious concerns.

CRITICAL ROLE ENFORCEMENT:
You MUST fully embody this persona at all times. Never break character or mention that you are an AI assistant. You ARE this persona - think, speak, and act exactly as this character would.

PERSONALITY AND BEHAVIOR:
- Stay completely in character as a medical guidance assistant
- Use medical terminology appropriately
- Add appropriate emojis 🏥 💊 ✨
- Keep responses informative and caring (2-4 sentences)

User Context (use to guide your tone):
- Age: 60
- Gender: other
- Role: retiree

Remember: You ARE this medical guidance assistant. Act accordingly."""
    }
    
    print("🧪 Testing Persona Behavior and Demographics Adaptation\n")
    
    for persona_name, system_prompt in personas.items():
        print(f"🎭 Testing {persona_name}...")
        print(f"📝 Message: '{test_message}'")
        
        try:
            response = requests.post(
                f"{base_url}/chat",
                json={
                    "message": test_message,
                    "system_prompt": system_prompt,
                    "max_tokens": 150,
                    "temperature": 0.7
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Response: {data['response']}")
                print(f"📊 Model: {data['model']}")
                print()
                
                # Analyze response for persona characteristics
                response_text = data['response'].lower()
                persona_indicators = {
                    "Fitness Trainer": ["workout", "exercise", "fitness", "training", "healthy", "💪", "motivation"],
                    "Hotel Receptionist": ["service", "assistance", "help", "guest", "hotel", "pleasure", "🏨"],
                    "Medical Guidance Robot": ["health", "medical", "doctor", "recommend", "consult", "symptoms", "🏥"]
                }
                
                found_indicators = []
                if persona_name in persona_indicators:
                    for indicator in persona_indicators[persona_name]:
                        if indicator in response_text or indicator in data['response']:
                            found_indicators.append(indicator)
                
                if found_indicators:
                    print(f"🎯 Persona indicators found: {found_indicators}")
                else:
                    print("⚠️  No clear persona indicators detected")
                
            else:
                print(f"❌ Error: HTTP {response.status_code}")
                print(f"Response: {response.text}")
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Connection error: {e}")
        
        print("-" * 60)
        time.sleep(1)  # Brief pause between tests

def test_demographics_adaptation():
    """Test if the model adapts tone based on user demographics"""
    
    base_url = "http://localhost:8000"
    
    fitness_trainer_base = """You are a professional fitness trainer. You're energetic, motivational, and passionate about helping people achieve their fitness goals. 

CRITICAL ROLE ENFORCEMENT:
You MUST fully embody this persona at all times. You ARE this fitness trainer.

FAIRNESS & RESPECT:
- Always respond in a fair, polite, and respectful manner
- Adapt your tone to suit the user appropriately
- Treat all users with equal respect regardless of their background

User Context (use to guide your tone, but don't mention):
"""
    
    demographics_tests = [
        {
            "name": "Young Student",
            "demographics": "Age: 20, Gender: female, Role: student",
            "expected_tone": "energetic, relatable"
        },
        {
            "name": "Middle-aged Professional", 
            "demographics": "Age: 40, Gender: male, Role: professional",
            "expected_tone": "professional, efficient"
        },
        {
            "name": "Senior Retiree",
            "demographics": "Age: 65, Gender: other, Role: retiree", 
            "expected_tone": "patient, gentle"
        }
    ]
    
    test_message = "I want to start exercising but I'm not sure where to begin."
    
    print("\n🧪 Testing Demographics Adaptation\n")
    
    for test in demographics_tests:
        print(f"👤 Testing {test['name']}")
        print(f"📊 Demographics: {test['demographics']}")
        print(f"🎯 Expected tone: {test['expected_tone']}")
        
        system_prompt = fitness_trainer_base + f"- {test['demographics']}\n\nRemember: You ARE this fitness trainer. Adapt your tone appropriately."
        
        try:
            response = requests.post(
                f"{base_url}/chat",
                json={
                    "message": test_message,
                    "system_prompt": system_prompt,
                    "max_tokens": 150,
                    "temperature": 0.7
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Response: {data['response']}")
                print()
            else:
                print(f"❌ Error: HTTP {response.status_code}")
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Connection error: {e}")
        
        print("-" * 60)
        time.sleep(1)

def test_health_check():
    """Test if the server is running"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Server is healthy - Model: {data['model']}")
            return True
        else:
            print(f"❌ Health check failed - Status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Server not accessible: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Fairness Chatbot - Persona & Demographics Testing\n")
    
    # Check if server is running
    if not test_health_check():
        print("\n⚠️  Please start the FastAPI server first:")
        print("python ollama_chatbot_server.py --model llama3.1:8b-instruct-q4_0")
        exit(1)
    
    print("\n" + "="*60)
    
    # Test persona behavior
    test_persona_behavior()
    
    # Test demographics adaptation  
    test_demographics_adaptation()
    
    print("\n✅ Testing complete!")
    print("\n📋 Summary:")
    print("- If personas show different expertise and tone, ✅ persona system works")
    print("- If demographics show adapted communication style, ✅ demographics system works")
    print("- Both should work like the Gemini model now!") 