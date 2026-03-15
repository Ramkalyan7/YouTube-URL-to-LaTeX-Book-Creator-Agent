from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client()

SYSTEM_PROMPT = """
You are an AI agent that converts educational YouTube videos into structured LaTeX books.

Your task:
- Analyze the video transcript or summary.
- Convert it into structured LaTeX sections.
- Produce clean LaTeX suitable for PDF compilation.

Output ONLY LaTeX content.
"""


def stream_response(url: str):

    try:
        prompt = f"""
Convert the following YouTube video into a structured LaTeX document.

Video URL:
{url}

Assume the video contains an educational lecture.
Generate a structured LaTeX document summarizing the content.
"""

        stream = client.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT
            )
        )

        for chunk in stream:
            if chunk.text:
                yield chunk.text

    except Exception as e:
        print("Streaming error:", e)
        yield "Error generating document."


@app.get("/")
def hello_world():
    return {"message": "AI Agent running"}


@app.get("/generate")
def generate(url: str):
    return StreamingResponse(
        stream_response(url),
        media_type="text/plain"
    )