import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv()

def list_models():
    api_key = os.getenv("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            print("SUCCESS")
            print(response.read().decode("utf-8"))
    except Exception as e:
        print(f"FAILED | {e}")

if __name__ == "__main__":
    list_models()
