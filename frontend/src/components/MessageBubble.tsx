import type { Message } from "../types/message"

interface Props {
  message: Message
}

export default function MessageBubble({ message }: Props) {

  const isUser = message.role === "user"

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>

      <div
        className={`
        max-w-xl px-4 py-2 rounded-xl text-sm whitespace-pre-wrap
        ${isUser
          ? "bg-green-500 text-black"
          : "bg-gray-800 text-green-300"}
        `}
      >
        {message.content}
      </div>

    </div>
  )
}