from google import genai
from google.genai import types
from tools import get_transcript
from compiler import compile_latex_to_pdf, CompilationError
from dotenv import load_dotenv
import os



load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_LLM_API_KEY"))

MAX_AGENT_TURNS = 10  
GET_TRANSCRIPT_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="get_transcript",
            description=(
                "Fetches the transcript of a YouTube video. "
                "Validates that the video is under 15 minutes."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "url": types.Schema(type=types.Type.STRING, description="Full YouTube URL")
                },
                required=["url"],
            ),
        ),
        types.FunctionDeclaration(
            name="compile_latex",
            description=(
                "Compiles LaTeX to PDF. Returns success=True when done. "
                "If success=False, read the errors, fix the LaTeX, and call again."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "latex": types.Schema(type=types.Type.STRING, description="Full LaTeX string")
                },
                required=["latex"],
            ),
        ),
    ]
)

SYSTEM_PROMPT = """
You are an AI agent that converts educational YouTube videos into structured LaTeX documents.

Strict workflow:
1. Call get_transcript(url).
2. If it fails → reply with the error message. Stop.
3. Generate a complete, compilable LaTeX document from the transcript.
4. Call compile_latex(latex).
5. If compile_latex fails → fix ONLY the reported errors, call compile_latex again.
6. When compile_latex returns success=True → reply: "PDF compiled successfully."

LaTeX rules:
- \\documentclass{article}
- Packages: geometry, hyperref, amsmath, amssymb, enumitem, titlesec
- Include: title, author (AI Generated), \\date{\\today}, abstract, sections
- Escape ALL special characters: & % $ # _ { } ~ ^ \\
- No markdown. No ``` fences. No explanation text outside LaTeX. 
- End with \\end{document} — nothing after it.
"""

_pdf_bytes_store: dict = {}


def _tool_compile_latex(latex: str) -> dict:
    try:
        pdf_bytes = compile_latex_to_pdf(latex)
        _pdf_bytes_store["latest"] = pdf_bytes
        return {"success": True, "pdf_ready": True}
    except CompilationError as e:
        return {"success": False, "errors": e.errors}
    except Exception as e:
        return {"success": False, "errors": str(e)}


TOOL_REGISTRY = {
    "get_transcript": get_transcript,
    "compile_latex": _tool_compile_latex,
}


def run_agent(url: str) -> bytes:
    """
    Full agent loop: transcript → LaTeX → compiled PDF bytes.
    Raises ValueError for user-facing errors (bad URL, video too long etc.)
    Raises RuntimeError for unexpected agent failures.
    """
    _pdf_bytes_store.clear()

    messages = [
        types.Content(
            role="user",
            parts=[types.Part(text=f"Convert this YouTube video to a PDF: {url}")]
        )
    ]

    print("[agent] Starting...")
    turns = 0

    while turns < MAX_AGENT_TURNS:
        turns += 1
        print(f"[agent] Turn {turns}/{MAX_AGENT_TURNS}")

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=messages,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[GET_TRANSCRIPT_TOOL],
            ),
        )

        candidate = response.candidates[0]

        finish_reason = str(candidate.finish_reason)
        if finish_reason not in ("STOP", "FinishReason.STOP", "1"):
            raise RuntimeError(f"Model stopped unexpectedly: {finish_reason}")

        parts = candidate.content.parts
        messages.append(types.Content(role="model", parts=parts))

        function_calls = [p for p in parts if p.function_call is not None]
        if function_calls:
            tool_response_parts = []
            for part in function_calls:
                fn_name = part.function_call.name
                fn_args = dict(part.function_call.args)
                print(f"[agent] Tool → {fn_name}")

                result = (
                    TOOL_REGISTRY[fn_name](**fn_args)
                    if fn_name in TOOL_REGISTRY
                    else {"success": False, "errors": f"Unknown tool: {fn_name}"}
                )

                print(f"[agent] Result → success={result.get('success')}")
                tool_response_parts.append(
                    types.Part(
                        function_response=types.FunctionResponse(
                            name=fn_name,
                            response=result,
                        )
                    )
                )

            messages.append(types.Content(role="user", parts=tool_response_parts))
            continue

        if "latest" in _pdf_bytes_store:
            print("[agent] PDF ready ✓")
            return _pdf_bytes_store["latest"]

        text = " ".join(p.text for p in parts if p.text).strip()
        raise ValueError(text or "Agent stopped without producing a PDF.")

    raise RuntimeError(f"Agent exceeded {MAX_AGENT_TURNS} turns without finishing.")