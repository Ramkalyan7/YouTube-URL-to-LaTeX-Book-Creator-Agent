from google import genai
from dotenv import load_dotenv
import os

load_dotenv()


client = genai.Client(api_key=os.getenv("GEMINI_LLM_API_KEY"))

stream = client.models.generate_content_stream(
    model="gemini-2.5-flash",
    contents="Explain AI in simple terms"
)

for chunk in stream:
    if chunk.text:
        print(chunk.text, end="")