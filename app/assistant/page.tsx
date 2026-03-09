"use client"

import { Bot, ShieldCheck, Wallet, Zap } from "lucide-react"
import { useAccount } from "wagmi"
import { Navbar } from "@/components/navbar"
import { AIChatPanel } from "@/components/ai-chat-panel"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const PRICE_LABEL = process.env.NEXT_PUBLIC_X402_PRICE_DISPLAY || "0.01 USDC / 次"

export default function AssistantPage() {
  const { address, isConnected } = useAccount()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_50%)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 lg:px-8">
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
              <CardContent className="space-y-6 p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-primary">
                  <Bot className="h-3.5 w-3.5" />
                  AI Assistant
                </div>

                <div className="space-y-3">
                  <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">AI 助手</h1>
                  <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                    直接调度OpenClaw进行对话，按次收费
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="border-primary/30 font-mono text-primary">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    OKX X402 API
                  </Badge>
                  <Badge variant="outline" className="border-border font-mono text-muted-foreground">
                    X Layer
                  </Badge>
                  <Badge variant="outline" className="border-border font-mono text-muted-foreground">
                    {PRICE_LABEL}
                  </Badge>
                </div>

                <div className="grid gap-3">
                  <Card className="border-border/70 bg-background/50">
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Zap className="h-4 w-4 text-primary" />
                        按次付费
                      </div>
                      <p className="text-sm text-muted-foreground">采用OKX X402免Gas费模式</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/70 bg-background/50">
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Wallet className="h-4 w-4 text-primary" />
                        当前钱包
                      </div>
                      <p className="text-sm text-muted-foreground">{isConnected && address ? address : "未连接 OKX 钱包"}</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <AIChatPanel
              className="h-[720px] bg-card/80 backdrop-blur-sm"
              title="OpenClaw助手"
              description="让每个人都能体验到OpenClaw的强大功能"
            />
          </section>
        </div>
      </main>
    </div>
  )
}
