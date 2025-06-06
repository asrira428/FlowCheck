import google.generativeai as genai
from dotenv import load_dotenv
import os

# Load your .env
load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Print available models
for model in genai.list_models():
    print(model.name)