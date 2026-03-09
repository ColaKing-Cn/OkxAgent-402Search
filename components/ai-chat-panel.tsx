"use client"

import { useEffect, useRef, useState } from "react"
import { useAccount } from "wagmi"
import { Bot, Loader2, Send, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { requestPaidAnswer } from "@/lib/request-paid-answer"

type ChatMsg = { role: "user" | "assistant"; text: string }

export function AIChatPanel({
  title = "OpenClaw助手",
  description = "让每个人都能体验到OpenClaw的强大功能",
  className,
}: {
  title?: string
  description?: string
  className?: string
}) {
  const { isConnected, address } = useAccount()
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [online, setOnline] = useState<boolean | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const restartingRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const tryRestart = async () => {
      if (restartingRef.current) return
      restartingRef.current = true
      setReconnecting(true)
      try {
        const res = await fetch("/api/health/restart", { method: "POST" })
        const data = await res.json()
        if (!cancelled && (data.restarted || data.reason === "already_online")) {
          setOnline(true)
        }
      } catch {}
      if (!cancelled) setReconnecting(false)
      restartingRef.current = false
    }

    const check = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" })
        const data = await res.json()
        if (cancelled) return
        const isOnline = Boolean(data.online)
        setOnline(isOnline)
        if (!isOnline && !restartingRef.current) {
          void tryRestart()
        }
      } catch {
        if (!cancelled) {
          setOnline(false)
          if (!restartingRef.current) void tryRestart()
        }
      }
    }

    void check()
    const interval = setInterval(check, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  async function send() {
    const question = input.trim()
    if (!question || loading) return

    if (!isConnected || !address) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "请先连接钱包。AI 助手现在按 x402 流程逐次收费，请求会先返回 402，再由钱包签名支付授权。" },
      ])
      setInput("")
      return
    }

    setLoading(true)
    setMessages((prev) => [...prev, { role: "user", text: question }])
    setInput("")

    try {
      const data = await requestPaidAnswer(question, address)
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer || "（无回答）" }])
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: "assistant", text: `出错了：${error?.message || String(error)}` }])
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send()
  }

  return (
    <Card className={cn("flex min-h-0 flex-col overflow-hidden border-border bg-card", className)}>
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 rounded-full",
                  reconnecting
                    ? "animate-pulse bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                    : online === null
                      ? "animate-pulse bg-muted-foreground/40"
                      : online
                        ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                        : "bg-red-500"
                )}
                title={reconnecting ? "重连中..." : online === null ? "检测中..." : online ? "在线" : "离线"}
              />
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            {messages.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">你好，我是你专属的 OpenClaw 助手</p>
                  <p className="mt-1 text-sm text-muted-foreground">通过 OpenClaw 回答问题。</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((message, index) => (
                  <div key={index} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        message.role === "user" ? "bg-secondary" : "bg-primary/10"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="h-3.5 w-3.5 text-secondary-foreground" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
                {loading ? (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex items-center rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      等待钱包签名 / 服务端结算中...
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={onSubmit} className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isConnected ? "输入问题并发起 x402 付费请求..." : "请先连接钱包"}
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
