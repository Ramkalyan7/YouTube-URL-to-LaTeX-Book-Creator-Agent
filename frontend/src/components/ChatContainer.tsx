import { useEffect, useState } from "react"
import MessageBubble from "./MessageBubble"
import ChatInput from "./ChatInput"
import type { Message } from "../types/message"

export default function ChatContainer() {

  const [messages, setMessages] = useState<Message[]>([])
  const [streamingMessage, setStreamingMessage] = useState("")

  const sendPrompt = async (prompt: string) => {

    const userMessage: Message = {
      role: "user",
      content: prompt
    }

    setMessages(prev => [...prev, userMessage])
    setStreamingMessage("")

    const response = await fetch(
      `http://127.0.0.1:8000/chat?prompt=${encodeURIComponent(prompt)}`
    )

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) return

    let aiResponseMessage="";
    while (true) {

      const { done, value } = await reader.read()

      if (done) break

      const chunk = decoder.decode(value)
      
      aiResponseMessage+=chunk;
      setStreamingMessage(prev => prev + chunk)
    }

    const aiMessage: Message = {
      role: "assistant",
      content: aiResponseMessage
    }

    
    console.log(streamingMessage,"streaming message")
    setMessages(prev => [...prev, aiMessage])
    setStreamingMessage("")
  }

  useEffect(()=>{
    console.log(messages)
  },[messages])

  return (

    <div className="flex flex-col h-screen bg-[#0f172a] text-green-300">

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {streamingMessage && (
          <MessageBubble
            message={{
              role: "assistant",
              content: streamingMessage
            }}
          />
        )}

      </div>

      <ChatInput onSend={sendPrompt} />

    </div>
  )
}