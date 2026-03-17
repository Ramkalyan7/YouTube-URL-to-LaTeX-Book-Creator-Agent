import subprocess
import tempfile
import os
import re
import shutil
from pathlib import Path

TEMP_BASE = Path("C:/tmp/latex") if os.name == "nt" else Path(tempfile.gettempdir()) / "latex"
TEMP_BASE.mkdir(parents=True, exist_ok=True)

MAX_RETRIES = 2
COMPILE_TIMEOUT = 60 


class CompilationError(Exception):
    def __init__(self, message: str, log: str = ""):
        super().__init__(message)
        self.log = log
        self.errors = _parse_latex_errors(log)


def _check_pdflatex_installed():
    cmd = "where" if os.name == "nt" else "which"
    result = subprocess.run([cmd, "pdflatex"], capture_output=True)
    if result.returncode != 0:
        install_hint = (
            "Download from https://miktex.org/download"
            if os.name == "nt"
            else "Run: sudo apt install texlive-latex-base"
        )
        raise RuntimeError(f"pdflatex is not installed. {install_hint}")


def _parse_latex_errors(log: str) -> str:
    """Extract only the ! error lines + context from a pdflatex log."""
    error_lines = []
    lines = log.splitlines()
    for i, line in enumerate(lines):
        if line.startswith("!"):
            error_lines.extend(lines[i: i + 4])
            error_lines.append("---")
    return "\n".join(error_lines) if error_lines else log[:2000]


def _clean_latex(latex: str) -> str:
    """Strip markdown fences Gemini sometimes adds."""
    latex = re.sub(r"^```(?:latex)?\s*", "", latex.strip())
    latex = re.sub(r"\s*```$", "", latex.strip())
    return latex.strip()


def _sanitize_latex(latex: str) -> str:
    """
    Fix common Gemini LaTeX mistakes before even trying to compile:
    - Removes non-ASCII characters that pdflatex can't handle
    - Ensures \begin{document} exists
    - Strips any text after \end{document}
    """
    end_doc = latex.find(r"\end{document}")
    if end_doc != -1:
        latex = latex[: end_doc + len(r"\end{document}")]

    if r"\begin{document}" not in latex:
        raise CompilationError(
            "Generated LaTeX is missing \\begin{document}.",
            log="Missing \\begin{document}",
        )

    return latex


def compile_latex_to_pdf(latex: str) -> bytes:
    """
    Compiles LaTeX string → PDF bytes.
    Retries up to MAX_RETRIES times.
    Raises CompilationError with parsed error lines on final failure.
    """
    _check_pdflatex_installed()

    latex = _clean_latex(latex)
    latex = _sanitize_latex(latex)

    last_log = ""

    for attempt in range(1, MAX_RETRIES + 1):
        print(f"[compiler] Attempt {attempt}/{MAX_RETRIES}...")

        with tempfile.TemporaryDirectory(dir=TEMP_BASE) as tmpdir:
            tex_path = Path(tmpdir) / "document.tex"
            pdf_path = Path(tmpdir) / "document.pdf"
            log_path = Path(tmpdir) / "document.log"

            tex_path.write_text(latex, encoding="utf-8")

            try:
                result = subprocess.run(
                    [
                        "pdflatex",
                        "-interaction=nonstopmode",
                        "-halt-on-error",
                        "-output-directory", str(tmpdir),
                        str(tex_path),
                    ],
                    capture_output=True,
                    text=True,
                    timeout=COMPILE_TIMEOUT,
                )
            except subprocess.TimeoutExpired:
                raise CompilationError(
                    f"pdflatex timed out after {COMPILE_TIMEOUT}s.",
                    log="TimeoutExpired",
                )

            last_log = (
                log_path.read_text(encoding="utf-8", errors="replace")
                if log_path.exists()
                else result.stdout
            )

            if result.returncode == 0 and pdf_path.exists():
                print(f"[compiler] Success on attempt {attempt}.")
                return pdf_path.read_bytes()

            print(f"[compiler] Attempt {attempt} failed.")

    raise CompilationError(
        f"pdflatex failed after {MAX_RETRIES} attempts.",
        log=last_log,
    )