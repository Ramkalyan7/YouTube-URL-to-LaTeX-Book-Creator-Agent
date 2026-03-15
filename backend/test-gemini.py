from google import genai
from dotenv import load_dotenv
import os

# load .env file
load_dotenv()

client = genai.Client()

stream = client.models.generate_content_stream(
    model="gemini-2.5-flash",
    contents="Explain AI in simple terms"
)

for chunk in stream:
    if chunk.text:
        print(chunk.text, end="")