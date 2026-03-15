import { useState } from "react"

export default function YoutubeAgent() {

  const [url, setUrl] = useState("")
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)

  const generate = async () => {

    if (!url) return

    setOutput("")
    setLoading(true)

    const response = await fetch(
      `http://127.0.0.1:8000/generate?url=${encodeURIComponent(url)}`
    )

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) return

    while (true) {

      const { done, value } = await reader.read()

      if (done) break

      const chunk = decoder.decode(value)

      setOutput(prev => prev + chunk)
    }

    setLoading(false)
  }

  return (

    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#020617] to-black text-white flex flex-col">

      {/* Navbar */}

      <div className="flex justify-between items-center px-10 py-6 border-b border-white/10">

        <div className="text-xl font-semibold tracking-wide">
          AI Agent
        </div>

        <div className="text-sm text-gray-400">
          YouTube → LaTeX PDF Generator
        </div>

      </div>

      {/* Hero Section */}

      <div className="flex flex-col items-center text-center mt-20 px-6">

        <h1 className="text-5xl font-semibold leading-tight max-w-3xl">
          Turn any YouTube video into a
          <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            {" "}structured PDF book
          </span>
        </h1>

        <p className="text-gray-400 mt-6 max-w-xl text-lg">
          Our AI agent extracts knowledge from YouTube videos and converts it
          into a clean LaTeX document ready to compile into a professional PDF.
        </p>

      </div>

      {/* Input Card */}

      <div className="flex justify-center mt-16 px-6">

        <div className="w-full max-w-3xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          <div className="text-sm text-gray-400 mb-4">
            Paste a YouTube URL
          </div>

          <div className="flex gap-3">

            <input
              className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-green-400 transition"
              placeholder="https://youtube.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            <button
              onClick={generate}
              className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 rounded-xl font-medium hover:scale-105 transition"
            >
              Generate PDF
            </button>

          </div>

          {loading && (

            <div className="mt-6 flex items-center gap-3 text-green-400">

              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-150"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-300"></div>

              <span className="ml-3 text-sm text-gray-400">
                AI agent analyzing video...
              </span>

            </div>

          )}

        </div>

      </div>

      {/* Output Panel */}

      {output && (

        <div className="flex justify-center mt-14 px-6 pb-20">

          <div className="w-full max-w-4xl">

            <div className="text-sm text-gray-500 mb-3">
              Generated LaTeX
            </div>

            <div className="bg-black border border-white/10 rounded-xl p-6 overflow-auto h-[420px]">

              <pre className="whitespace-pre-wrap text-green-300 text-sm leading-relaxed">
                {output}
              </pre>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}