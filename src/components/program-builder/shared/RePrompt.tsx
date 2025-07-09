"use client"

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { Button } from "@/components/ui/button"
import { ChatContainerRoot, ChatContainerContent } from "@/components/ui/chat-container"
import { cn } from "@/lib/utils"
import {
  ArrowUp,
  Copy,
  Globe,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"
import { useState } from "react"
import { ScrollButton } from "@/components/ui/scroll-button"

const messages = [
  {
    id: 1,
    role: "user",
    content: "Hello! Can you help me with a coding question?",
  },
]

function RePrompt() {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState(messages)

  const handleSubmit = () => {
    if (!prompt.trim()) return

    setPrompt("")
    setIsLoading(true)

    // Add user message immediately
    const newUserMessage = {
      id: chatMessages.length + 1,
      role: "user",
      content: prompt.trim(),
    }

    setChatMessages([...chatMessages, newUserMessage])

    // Simulate API response
    setTimeout(() => {
      const assistantResponse = {
        id: chatMessages.length + 2,
        role: "assistant",
        content: `This is a response to: "${prompt.trim()}"`,
      }

      setChatMessages((prev) => [...prev, assistantResponse])
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col h-[90vh]">
        <div className="min-h-12 m-2 border-b flex flex-row gap-2 flex-shrink-0">
            <Button variant="default" className="bg-lightGray text-black hover:bg-lightGray">Chat</Button>
            <Button variant="ghost" className="text-black hover:bg-lightGray">Filters</Button>
        </div>
      <ChatContainerRoot className="flex-1 overflow-y-auto relative">
        <ChatContainerContent className="h-full">
          {chatMessages.map((message, index) => {
            const isAssistant = message.role === "assistant"
            const isLastMessage = index === chatMessages.length - 1

            return (
              <Message
                key={message.id}
                className={cn(
                  "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6",
                  isAssistant ? "items-start" : "items-end"
                )}
              >
                {isAssistant ? (
                  <div className="group flex w-full flex-col gap-0">
                    <MessageContent
                      className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0"
                      markdown
                    >
                      {message.content}
                    </MessageContent>
                    <MessageActions
                      className={cn(
                        "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                        isLastMessage && "opacity-100"
                      )}
                    >
                      <MessageAction tooltip="Edit" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <Copy />
                        </Button>
                      </MessageAction>
                      <MessageAction tooltip="Upvote" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <ThumbsUp />
                        </Button>
                      </MessageAction>
                      <MessageAction tooltip="Downvote" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <ThumbsDown />
                        </Button>
                      </MessageAction>
                    </MessageActions>
                  </div>
                ) : (
                  <div className="group flex flex-col items-end gap-1">
                    <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                      {message.content}
                    </MessageContent>
                    <MessageActions
                      className={cn(
                        "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      )}
                    >
                      <MessageAction tooltip="Edit" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <Pencil />
                        </Button>
                      </MessageAction>
                      <MessageAction tooltip="Delete" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <Trash />
                        </Button>
                      </MessageAction>
                      <MessageAction tooltip="Copy" delayDuration={100}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <Copy />
                        </Button>
                      </MessageAction>
                    </MessageActions>
                  </div>
                )}
              </Message>
            )
          })}
          <div className="absolute bottom-4 right-5 z-50">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerContent>
      </ChatContainerRoot>
      <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl flex-shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <PromptInput
          isLoading={isLoading}
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={handleSubmit}
          className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
        >
          <div className="flex flex-col">
            <PromptInputTextarea
              placeholder="Ask anything"
              className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
            />

            <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
              <div className="flex items-center gap-2">
                <PromptInputAction tooltip="Add a new action">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                  >
                    <Plus size={18} />
                  </Button>
                </PromptInputAction>

                <PromptInputAction tooltip="Search">
                  <Button variant="outline" className="rounded-full">
                    <Globe size={18} />
                    Search
                  </Button>
                </PromptInputAction>

                <PromptInputAction tooltip="More actions">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                  >
                    <MoreHorizontal size={18} />
                  </Button>
                </PromptInputAction>
              </div>
              <div className="flex items-center gap-2">
                <PromptInputAction tooltip="Voice input">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                  >
                    <Mic size={18} />
                  </Button>
                </PromptInputAction>

                <Button
                  size="icon"
                  disabled={!prompt.trim() || isLoading}
                  onClick={handleSubmit}
                  className="size-9 rounded-full bg-lightSecondary"
                >
                  {!isLoading ? (
                    <ArrowUp className="text-white" size={18} />
                  ) : (
                    <span className="size-3 rounded-xs bg-white" />
                  )}
                </Button>
              </div>
            </PromptInputActions>
          </div>
        </PromptInput>
      </div>
    </div>
  )
}

export { RePrompt }
