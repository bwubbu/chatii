import os
from huggingface_hub import login

# You can set your token here temporarily for testing
# Get your token from: https://huggingface.co/settings/tokens
HF_TOKEN = "your_token_here"  # Replace with your actual token

if HF_TOKEN != "your_token_here":
    try:
        login(token=HF_TOKEN)
        print("✅ Successfully logged in to Hugging Face!")
    except Exception as e:
        print(f"❌ Login failed: {e}")
else:
    print("Please replace 'your_token_here' with your actual Hugging Face token")
    print("Get your token from: https://huggingface.co/settings/tokens") 