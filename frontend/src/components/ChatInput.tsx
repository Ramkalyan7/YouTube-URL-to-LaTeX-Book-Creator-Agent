import { useState } from "react"

interface Props {
  onSend: (message: string) => void
}

export default function ChatInput({ onSend }: Props) {

  const [input, setInput] = useState("")

  const send = () => {
    if (!input.trim()) return
    onSend(input)
    setInput("")
  }

  return (
    <div className="flex gap-2 p-4 border-t border-gray-700">

      <input
        className="flex-1 bg-gray-900 text-green-300 border border-gray-700 rounded-lg px-3 py-2"
        placeholder="Ask something..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
        onClick={send}
      >
        Send
      </button>

    </div>
  )
}