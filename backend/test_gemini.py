import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv()

def test_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    prompt = "Hello"
    
    models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"]
    versions = ["v1beta", "v1"]
    
    for v in versions:
        for m in models:
            url = f"https://generativelanguage.googleapis.com/{v}/models/{m}:generateContent?key={api_key}"
            req_data = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
            req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"}, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=5) as response:
                    print(f"SUCCESS: {v}/{m}")
                    return
            except Exception as e:
                print(f"FAILED: {v}/{m} | {e}")

if __name__ == "__main__":
    test_gemini()
