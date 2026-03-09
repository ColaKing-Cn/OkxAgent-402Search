"use client"

import { useState } from "react"
import { MessageCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AIChatPanel } from "@/components/ai-chat-panel"
import { cn } from "@/lib/utils"

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 hover:bg-primary/90",
          isOpen && "hidden"
        )}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="sr-only">打开AI助手</span>
      </Button>

      {isOpen ? (
        <div className="fixed bottom-6 right-6 z-50 h-[500px] w-[380px] sm:h-[550px]">
          <AIChatPanel
            className="h-full shadow-2xl"
            title="AI 助手"
            description="每次提问都会先走 HTTP 402，再通过钱包完成 x402 支付授权。"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">关闭</span>
          </Button>
        </div>
      ) : null}
    </>
  )
}
