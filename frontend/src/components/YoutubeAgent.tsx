import { useState, useRef } from "react"

type Stage = "idle" | "loading" | "success" | "error"

interface ErrorDetail {
  message: string
  code: number
}

export default function YoutubeAgent() {
  const [url, setUrl] = useState("")
  const [stage, setStage] = useState<Stage>("idle")
  const [error, setError] = useState<ErrorDetail | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  // Rotate through status messages while loading
  const STATUS_MESSAGES = [
    "Fetching video transcript...",
    "Analyzing content structure...",
    "Generating LaTeX document...",
    "Compiling PDF...",
  ]
  const statusIndexRef = useRef(0)
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startStatusRotation = () => {
    statusIndexRef.current = 0
    setStatusMsg(STATUS_MESSAGES[0])
    statusTimerRef.current = setInterval(() => {
      statusIndexRef.current = Math.min(
        statusIndexRef.current + 1,
        STATUS_MESSAGES.length - 1
      )
      setStatusMsg(STATUS_MESSAGES[statusIndexRef.current])
    }, 4000)
  }

  const stopStatusRotation = () => {
    if (statusTimerRef.current) {
      clearInterval(statusTimerRef.current)
      statusTimerRef.current = null
    }
  }

  const isValidYoutubeUrl = (val: string) => {
    return /^https?:\/\/(www\.)?(youtube\.com\/watch\?.*v=|youtu\.be\/)/.test(val.trim())
  }

  const generate = async () => {
    if (!url.trim()) return

    // Basic client-side URL check before hitting backend
    if (!isValidYoutubeUrl(url)) {
      setStage("error")
      setError({ message: "Please enter a valid YouTube URL.", code: 0 })
      return
    }

    // Clean up previous PDF blob
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }

    setStage("loading")
    setError(null)
    startStatusRotation()

    abortRef.current = new AbortController()

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/generate?url=${encodeURIComponent(url)}`,
        {
          method: "POST",
          signal: abortRef.current.signal,
        }
      )

      stopStatusRotation()

      if (!response.ok) {
        // Parse FastAPI error detail
        const data = await response.json().catch(() => ({ detail: "Unknown error" }))
        setStage("error")
        setError({ message: data.detail ?? "Something went wrong.", code: response.status })
        return
      }

      // Response is PDF bytes — create a blob URL
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      setPdfUrl(objectUrl)
      setStage("success")

    } catch (err: unknown) {
      stopStatusRotation()
      if (err instanceof Error && err.name === "AbortError") return
      setStage("error")
      setError({ message: "Could not reach the server. Is it running?", code: 0 })
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
    stopStatusRotation()
    setStage("idle")
  }

  const reset = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
    setStage("idle")
    setError(null)
    setUrl("")
  }

  const downloadPdf = () => {
    if (!pdfUrl) return
    const a = document.createElement("a")
    a.href = pdfUrl
    a.download = "document.pdf"
    a.click()
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans">

      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 11L5 2L7 8L9 4L12 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-wide">DocuAgent</span>
        </div>
        <span className="text-xs text-white/30 tracking-widest uppercase">YouTube → PDF</span>
      </nav>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center px-6 pt-20 pb-32 flex-1">

        {/* Hero */}
        <div className="text-center max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-xs text-emerald-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-powered document generation
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-4">
            Turn YouTube into
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              structured PDFs
            </span>
          </h1>
          <p className="text-white/40 text-base leading-relaxed">
            Paste a video URL. Our agent fetches the transcript, generates clean
            LaTeX, compiles it, and hands you a professional PDF — in one click.
          </p>
        </div>

        {/* Input Card */}
        <div className="w-full max-w-2xl">
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 backdrop-blur-sm">

            <label className="block text-xs text-white/40 uppercase tracking-widest mb-3">
              YouTube URL
            </label>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm3.5 8.5l-5 3A.5.5 0 016 11V5a.5.5 0 01.5-.43l5 3a.5.5 0 010 .93z" />
                  </svg>
                </div>
                <input
                  type="url"
                  className="w-full bg-black/40 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition disabled:opacity-50"
                  placeholder="https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && stage === "idle" && generate()}
                  disabled={stage === "loading"}
                />
              </div>

              {stage === "loading" ? (
                <button
                  onClick={cancel}
                  className="px-5 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition text-white/60"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={generate}
                  disabled={!url.trim()}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-900/30"
                >
                  Generate PDF
                </button>
              )}
            </div>

            {/* Loading State */}
            {stage === "loading" && (
              <div className="mt-5 flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                <div className="relative w-8 h-8 shrink-0">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
                <div>
                  <p className="text-sm text-emerald-300 font-medium">{statusMsg}</p>
                  <p className="text-xs text-white/30 mt-0.5">This may take 30–60 seconds</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {stage === "error" && error && (
              <div className="mt-5 flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1v4M5 8v.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-400 font-medium">
                    {error.code === 422 ? "Validation error" : error.code === 400 ? "Processing failed" : "Error"}
                  </p>
                  <p className="text-xs text-white/40 mt-1 whitespace-pre-wrap">{error.message}</p>
                </div>
                <button
                  onClick={reset}
                  className="text-xs text-white/30 hover:text-white/60 transition shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

          </div>
        </div>

        {/* PDF Result */}
        {stage === "success" && pdfUrl && (
          <div className="w-full max-w-4xl mt-10">

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-white/60">PDF ready</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v7M3 5.5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Download PDF
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition"
                >
                  New document
                </button>
              </div>
            </div>

            {/* PDF iframe preview */}
            <div className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full"
                style={{ height: "75vh", border: "none" }}
                title="Generated PDF"
              />
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-xs text-white/15 border-t border-white/5">
        Supports videos up to 15 minutes · Requires transcript availability
      </footer>

    </div>
  )
}