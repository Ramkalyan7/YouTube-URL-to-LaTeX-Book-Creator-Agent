# YouTube URL to LaTeX Book Creator Agent

A full-stack AI-powered application that automatically converts educational YouTube videos into professionally formatted LaTeX documents and PDFs.

## Overview

This project uses **Google's Gemini 2.5 Flash** LLM with an agentic workflow to:
1. Extract transcripts from YouTube videos (up to 15 minutes)
2. Generate structured LaTeX documents from the video content
3. Compile LaTeX to PDF with automatic error correction

The application features a **FastAPI backend** for the AI agent and a **Vue 3 + TypeScript frontend** for user interaction.

## Project Structure

```
.
├── backend/                 # Python FastAPI backend with AI agent
│   ├── agent.py            # Main agentic loop (Gemini 2.5 Flash)
│   ├── compiler.py         # LaTeX to PDF compiler
│   ├── tools.py            # YouTube transcript extraction
│   ├── validator.py        # URL validation & video length checks
│   ├── main.py             # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── test-*.py           # Testing scripts
│
└── frontend/               # Vue 3 + TypeScript web UI
    ├── src/                # Vue components and assets
    ├── package.json        # Node.js dependencies
    ├── vite.config.ts      # Vite build configuration
    └── tsconfig.json       # TypeScript configuration
```

## Features

✨ **Key Capabilities:**
- 🎥 YouTube video transcript extraction (videos ≤ 15 minutes)
- 🤖 AI-powered document generation using Gemini LLM
- 📄 LaTeX document structure with proper formatting
- 🔄 Automatic error correction in LaTeX compilation
- 🖥️ Responsive web interface
- ⚡ Real-time PDF generation

## Technology Stack

### Backend
- **Python 3.x**
- **FastAPI** - Web framework
- **Google GenAI** - Gemini 2.5 Flash LLM
- **youtube-transcript-api** - Video transcript extraction
- **yt-dlp** - Video metadata & duration validation
- **pydantic** - Data validation
- **uvicorn** - ASGI server

### Frontend
- **React** - JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Modern build tool
- **CORS** - Cross-origin requests handling

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
Create a `.env` file in the backend directory:
```
GEMINI_LLM_API_KEY=your_gemini_api_key_here
```

5. Run the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Health Check
```
GET /
```
Response: `{"status": "ok", "message": "AI Agent running"}`

### Generate PDF from YouTube Video
```
POST /generate?url=<youtube_url>
```
- **Query Parameter:** `url` (string) - Full YouTube video URL
- **Response:** PDF file (application/pdf)
- **Status Codes:**
  - `200` - Success, PDF returned
  - `400` - Invalid video URL or video too long (>15 minutes)
  - `422` - Validation error
  - `500` - Server error (agent failure or LaTeX compilation error)

**Example Request:**
```bash
curl -X POST "http://localhost:8000/generate?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
  --output document.pdf
```

## Core Components

### `agent.py`
The main agentic loop orchestrated by Gemini 2.5 Flash:
- Fetches video transcript via `get_transcript()` tool
- Generates LaTeX document from transcript
- Compiles LaTeX to PDF via `compile_latex()` tool
- Handles tool responses and iterates up to 10 times

### `compiler.py`
- Compiles LaTeX strings to PDF bytes
- Captures and reports compilation errors
- Returns structured error information for agent recovery

### `tools.py`
- Extracts YouTube video transcripts
- Validates video URLs
- Enforces 15-minute duration limit

### `validator.py`
- Validates YouTube URLs
- Checks video duration
- Cleans and normalizes URLs

### `main.py` (FastAPI)
- Provides REST API endpoints
- Handles validation and error responses
- Returns PDF as attachment

## LaTeX Document Structure

Generated documents include:
- Document class: `article`
- Standard packages: `geometry`, `hyperref`, `amsmath`, `amssymb`, `enumitem`, `titlesec`
- Title, author, date, and abstract
- Content organized in sections
- Proper escaping of special characters

## Error Handling

The system handles various error scenarios:
1. **Invalid YouTube URLs** → 422 Validation Error
2. **Videos > 15 minutes** → 400 Bad Request
3. **LaTeX compilation errors** → Agent attempts auto-correction
4. **Agent failures** → 500 Server Error with error message
5. **Transcript unavailable** → User-facing error message

## Development & Testing

Test scripts are included:
- `test-gemini.py` - Test Gemini API connectivity
- `test-tools.py` - Test YouTube transcript extraction

Run tests from the backend directory:
```bash
python test-gemini.py
python test-tools.py
```

## Environment Variables

Required for backend operation:
- `GEMINI_LLM_API_KEY` - API key for Google Gemini 2.5 Flash

## CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:5173` (frontend development server)

Modify the `allow_origins` in `backend/main.py` for production deployment.
