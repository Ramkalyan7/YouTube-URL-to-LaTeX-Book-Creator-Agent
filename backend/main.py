from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from dotenv import load_dotenv
from validator import validate_youtube_url, ValidationError
from agent import run_agent

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "AI Agent running"}


@app.post("/generate")
def generate(url: str):
    # 1. Validate before touching the agent at all
    try:
        clean_url = validate_youtube_url(url)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # 2. Run agent
    try:
        pdf_bytes = run_agent(clean_url)
    except ValueError as e:
        # Clean agent error (no transcript, etc.)
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # Infrastructure error (pdflatex missing, agent loop exceeded, etc.)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

    # 3. Return PDF
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=document.pdf"},
    )