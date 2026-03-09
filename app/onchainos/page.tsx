"use client"

import { useEffect, useMemo, useState } from "react"
import { useAccount } from "wagmi"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CandlestickChart,
  CheckCircle2,
  Compass,
  Cpu,
  Database,
  Loader2,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  Waypoints,
  Waves,
  Zap,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { requestPaidOnchainOS, type PaidOnchainOSResponse } from "@/lib/request-paid-answer"
import { cn } from "@/lib/utils"

type Workflow = {
  key: string
  title: string
  subtitle: string
  accent: string
  icon: typeof Search
  steps: string[]
}

type PanelStatus = PaidOnchainOSResponse["panels"][number]["status"]

const workflows: Workflow[] = [
  {
    key: "auto",
    title: "自动搜索与购买",
    subtitle: "地址输入后自动拉起代币识别、资金检查与交易执行链路",
    accent: "from-emerald-500/30 via-primary/15 to-transparent",
    icon: Sparkles,
    steps: ["okx-dex-token 查找代币", "okx-wallet-portfolio 检查资金", "okx-dex-swap 执行交易"],
  },
  {
    key: "portfolio",
    title: "投资组合概览",
    subtitle: "从持仓出发，补上代币分析与市场视图",
    accent: "from-sky-500/30 via-cyan-500/15 to-transparent",
    icon: Wallet,
    steps: ["okx-wallet-portfolio 持仓", "okx-dex-token 添加分析", "okx-dex-market 价格图表"],
  },
  {
    key: "research",
    title: "市场研究",
    subtitle: "趋势、排名、K 线与历史数据串成研究面板",
    accent: "from-amber-500/30 via-orange-500/15 to-transparent",
    icon: CandlestickChart,
    steps: ["okx-dex-token 趋势/排名", "okx-dex-market K线/历史数据", "okx-dex-swap 交易"],
  },
  {
    key: "swap",
    title: "交换和广播",
    subtitle: "获取交易数据、本地签名、广播与订单跟踪一气呵成",
    accent: "from-fuchsia-500/30 via-pink-500/15 to-transparent",
    icon: Compass,
    steps: ["okx-dex-swap 获取交易数据", "本地签名", "okx-onchain-gateway 广播", "okx-onchain-gateway 跟踪顺序"],
  },
  {
    key: "preflight",
    title: "飞行前检查",
    subtitle: "先估算 gas，再模拟广播，最后追踪链上状态",
    accent: "from-violet-500/30 via-indigo-500/15 to-transparent",
    icon: ShieldCheck,
    steps: ["okx-onchain-gateway 估算气体", "okx-onchain-gateway 模拟发射", "okx-onchain-gateway 广播", "okx-onchain-gateway 跟踪顺序"],
  },
  {
    key: "full",
    title: "完整交易流程",
    subtitle: "搜索、价格、图表、余额检查组成标准交易前路径",
    accent: "from-rose-500/30 via-red-500/15 to-transparent",
    icon: Radar,
    steps: ["okx-dex-token 搜索", "okx-dex-market 价格/图表", "okx-wallet-portfolio 检查余额"],
  },
]

const addressPattern = /^0x[a-fA-F0-9]{40}$/

const statusStyles: Record<
  PanelStatus,
  { badge: string; glow: string; stripe: string; score: number; label: string }
> = {
  ready: {
    badge: "border-border/80 bg-secondary/60 text-muted-foreground",
    glow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    stripe: "from-zinc-400/50 via-zinc-500/10 to-transparent",
    score: 38,
    label: "待命",
  },
  action: {
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    glow: "shadow-[0_0_0_1px_rgba(56,189,248,0.14),0_18px_40px_rgba(14,165,233,0.12)]",
    stripe: "from-sky-400/70 via-cyan-500/20 to-transparent",
    score: 72,
    label: "执行中",
  },
  warning: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    glow: "shadow-[0_0_0_1px_rgba(245,158,11,0.14),0_18px_40px_rgba(245,158,11,0.10)]",
    stripe: "from-amber-400/70 via-orange-500/20 to-transparent",
    score: 58,
    label: "关注",
  },
  complete: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    glow: "shadow-[0_0_0_1px_rgba(16,185,129,0.14),0_18px_40px_rgba(16,185,129,0.12)]",
    stripe: "from-emerald-400/70 via-primary/20 to-transparent",
    score: 95,
    label: "完成",
  },
}

const toolAppearance: Record<string, { icon: typeof Database; tint: string; chip: string }> = {
  "okx-dex-token": {
    icon: Sparkles,
    tint: "text-emerald-300 bg-emerald-500/12 ring-emerald-500/20",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  "okx-wallet-portfolio": {
    icon: Wallet,
    tint: "text-sky-300 bg-sky-500/12 ring-sky-500/20",
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  "okx-dex-market": {
    icon: CandlestickChart,
    tint: "text-amber-300 bg-amber-500/12 ring-amber-500/20",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  "okx-dex-swap": {
    icon: Compass,
    tint: "text-fuchsia-300 bg-fuchsia-500/12 ring-fuchsia-500/20",
    chip: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300",
  },
  "okx-onchain-gateway": {
    icon: ShieldCheck,
    tint: "text-violet-300 bg-violet-500/12 ring-violet-500/20",
    chip: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
}

function getToolAppearance(tool: string) {
  return toolAppearance[tool] || {
    icon: Database,
    tint: "text-primary bg-primary/10 ring-primary/20",
    chip: "border-primary/30 bg-primary/10 text-primary",
  }
}

function buildSignalStats(result: PaidOnchainOSResponse | null, mode: string, openClawOnline: boolean | null) {
  const totalPanels = result?.panels.length || 0
  const completeCount = result?.panels.filter((panel) => panel.status === "complete").length || 0
  const warningCount = result?.panels.filter((panel) => panel.status === "warning").length || 0
  const actionCount = result?.panels.filter((panel) => panel.status === "action").length || 0
  const stepCount = result?.workflow.length || 0

  return [
    {
      label: "链路模式",
      value: result ? (result.mode === "address" ? "Address Flow" : "Research Flow") : mode === "address" ? "Address Flow" : "Standby",
      detail: result ? "OpenClaw 已返回工作流" : "等待调度器输出",
    },
    {
      label: "模块密度",
      value: totalPanels > 0 ? `${totalPanels} Panels` : "0 Panels",
      detail: `${actionCount} Active / ${warningCount} Risk`,
    },
    {
      label: "执行进度",
      value: stepCount > 0 ? `${Math.max(1, completeCount)} / ${stepCount}` : "0 / 0",
      detail: stepCount > 0 ? "依据工作流阶段自动计算" : "等待生成链路",
    },
    {
      label: "控制台状态",
      value: openClawOnline ? "Online" : openClawOnline === false ? "Offline" : "Syncing",
      detail: openClawOnline ? "已连到 OpenClaw" : "等待健康检查",
    },
  ]
}

export default function OnchainOSPage() {
  const { address, isConnected } = useAccount()
  const [query, setQuery] = useState("")
  const [openClawOnline, setOpenClawOnline] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PaidOnchainOSResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" })
        const data = await res.json()
        if (!cancelled) setOpenClawOnline(Boolean(data.online))
      } catch {
        if (!cancelled) setOpenClawOnline(false)
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [])

  const detectedMode = useMemo(() => {
    if (!query.trim()) return "idle"
    if (addressPattern.test(query.trim())) return "address"
    return "keyword"
  }, [query])

  const recommended = useMemo(() => {
    if (detectedMode === "address") return workflows[0]
    if (detectedMode === "keyword") return workflows[2]
    return workflows[5]
  }, [detectedMode])

  const signalStats = useMemo(() => buildSignalStats(result, detectedMode, openClawOnline), [result, detectedMode, openClawOnline])

  const executionSeries = useMemo(() => {
    const panels = result?.panels || []
    return panels.map((panel, index) => ({
      step: `P${index + 1}`,
      score: statusStyles[panel.status].score,
      full: 100,
      name: panel.title,
    }))
  }, [result])

  async function runWorkflow() {
    const value = query.trim()
    if (!value || loading) return

    setLoading(true)
    setError(null)

    try {
      const data = await requestPaidOnchainOS(value, address)
      setResult(data)
    } catch (nextError: any) {
      setError(nextError?.message || "OnchainOS 查询失败")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(56,189,248,0.16),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.08),transparent_25%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_50%)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 lg:px-8">
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden border-border/80 bg-card/80 backdrop-blur-sm">
              <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.12fr_0.88fr]">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                    <Waypoints className="h-3.5 w-3.5" />
                    OnchainOS Query
                  </div>
                  <div className="grid gap-4 2xl:grid-cols-[0.95fr_1.05fr] 2xl:items-end">
                    <div className="space-y-1">
                      <p className="text-4xl font-semibold tracking-tight sm:text-5xl">OnchainOS</p>
                      <p className="text-3xl font-semibold tracking-tight text-foreground/95 sm:text-4xl">查询</p>
                    </div>
                    <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-relaxed">
                      OpenClaw + OnchainOS 
                      快速生成地址分析、市场研究与交易执行流程。
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      {
                        icon: Cpu,
                        title: "OpenClaw编排",
                        text: "统一调度工具。",
                        tone: "bg-primary/10 text-primary",
                      },
                      {
                        icon: Database,
                        title: "地址即入口",
                        text: "地址自动匹配流程。",
                        tone: "bg-sky-500/10 text-sky-300",
                      },
                      {
                        icon: Zap,
                        title: "可执行输出",
                        text: "返回下一步动作。",
                        tone: "bg-amber-500/10 text-amber-300",
                      },
                    ].map((item) => (
                      <Card key={item.title} className="border-border/70 bg-background/50">
                        <CardContent className="flex min-h-[132px] flex-col items-start justify-between gap-4 p-4">
                          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", item.tone)}>
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
                    {signalStats.map((stat) => (
                      <div key={stat.label} className="rounded-3xl border border-white/6 bg-background/45 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{stat.label}</p>
                            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">{stat.value}</p>
                          </div>
                          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary/70" />
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{stat.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Card className="border-border/70 bg-background/60">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-lg">控制台入口</CardTitle>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono",
                          openClawOnline === true && "border-primary/30 text-primary",
                          openClawOnline === false && "border-destructive/30 text-destructive",
                          openClawOnline === null && "border-border text-muted-foreground"
                        )}
                      >
                        {openClawOnline === null ? "检测中" : openClawOnline ? "OpenClaw 在线" : "OpenClaw 离线"}
                      </Badge>
                    </div>
                    <CardDescription>输入账户地址、合约地址或研究关键词，发起一次真实的 OpenClaw 编排请求。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">账户地址 / 合约地址 / 关键词</label>
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            void runWorkflow()
                          }
                        }}
                        placeholder="例如 0x... 或 BTC / USDC / Layer2 Alpha"
                        className="h-12 rounded-2xl border-white/8 bg-background/60"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-border/80 text-muted-foreground">
                        {detectedMode === "idle" ? "等待输入" : detectedMode === "address" ? "识别为链上地址" : "识别为研究关键词"}
                      </Badge>
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        推荐路径：{recommended.title}
                      </Badge>
                    </div>
                    <div className="overflow-hidden rounded-[1.6rem] border border-border/80 bg-secondary/40">
                      <div className="bg-[radial-gradient(circle_at_left,rgba(16,185,129,0.18),transparent_26%)] p-4">
                        <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">自动链路</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {recommended.steps.map((step, index) => (
                            <div key={step} className="flex items-center gap-2">
                              <span className="rounded-full border border-white/8 bg-background px-2.5 py-1 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                {step}
                              </span>
                              {index < recommended.steps.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={!query.trim() || !isConnected || loading}
                        onClick={() => void runWorkflow()}
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {loading ? "执行中" : isConnected ? "连接 OpenClaw 工作流" : "先连接 OKX 钱包"}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 rounded-2xl border-border/80 bg-background/60"
                        disabled={!result}
                        onClick={() => {
                          if (!result) return
                          navigator.clipboard.writeText(JSON.stringify(result, null, 2)).catch(() => {})
                        }}
                      >
                        导出执行计划
                      </Button>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">当前钱包：{isConnected && address ? address : "未连接"}</p>
                    {error ? (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/80 bg-card/75 backdrop-blur-sm">
              <CardHeader className="border-b border-white/6">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Compass className="h-5 w-5 text-primary" />
                  执行视图
                </CardTitle>
                <CardDescription>把地址识别、资金检查、市场研究与网关广播放进一套统一可追踪的控制台。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {[
                  ["输入识别", detectedMode === "address" ? "已匹配链上地址，将自动查代币与资金。" : detectedMode === "keyword" ? "已切换到市场研究模式。" : "等待输入地址、合约或研究关键词。"],
                  ["钱包连接", isConnected ? "OKX 钱包已连接，可继续调度交易与广播。" : "未连接钱包，暂时仅展示推荐路径。"],
                  ["OpenClaw 编排", openClawOnline ? "在线，可接管多工具链任务。" : "离线或未知，建议先恢复服务。"],
                ].map(([title, text], index) => (
                  <div key={title} className="relative overflow-hidden rounded-[1.6rem] border border-border/70 bg-background/50 p-4">
                    <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/80 via-primary/20 to-transparent" />
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">{index + 1}</span>
                      <Activity className="h-4 w-4 text-primary" />
                      {title}
                    </div>
                    <p className="pl-9 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                ))}

                <div className="relative overflow-hidden rounded-[1.8rem] border border-primary/15 bg-[linear-gradient(145deg,rgba(16,185,129,0.14),rgba(12,18,26,0.05))] p-5">
                  <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
                  <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-primary">
                    <Waves className="h-3.5 w-3.5" />
                    Live Recommendation
                  </div>
                  <p className="text-base font-medium leading-relaxed">
                    {result?.recommendation || "执行后这里会显示 OpenClaw 给出的最新建议和人工确认点。"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {result ? (
            <>
              <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="overflow-hidden border-border/80 bg-card/80">
                  <CardHeader className="border-b border-white/6">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="h-5 w-5 text-primary" />
                      OpenClaw 输出摘要
                    </CardTitle>
                    <CardDescription>{result.mode === "address" ? "地址工作流" : "研究工作流"}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-4">
                      <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {result.actions.map((action, index) => (
                          <div
                            key={`${action}-${index}`}
                            className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                          >
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.8rem] border border-white/6 bg-background/45 p-4">
                      <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                        <Radar className="h-3.5 w-3.5" />
                        Stage Pulse
                      </div>
                      <ChartContainer
                        className="h-[220px] w-full"
                        config={{
                          score: { label: "阶段信号", color: "var(--color-primary)" },
                          full: { label: "上限", color: "rgba(255,255,255,0.08)" },
                        }}
                      >
                        <AreaChart data={executionSeries}>
                          <defs>
                            <linearGradient id="onchainos-score" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-score)" stopOpacity={0.45} />
                              <stop offset="95%" stopColor="var(--color-score)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis dataKey="step" tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.name} />} />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="var(--color-score)"
                            fill="url(#onchainos-score)"
                            strokeWidth={2.2}
                            activeDot={{ r: 5 }}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-border/80 bg-card/80">
                  <CardHeader className="border-b border-white/6">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      工作流轨道
                    </CardTitle>
                    <CardDescription>将 OpenClaw 返回的步骤转成可视化执行轨道。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 sm:p-6">
                    {result.workflow.map((step, index) => (
                      <div key={`${step}-${index}`} className="relative flex gap-4 rounded-[1.5rem] border border-border/70 bg-background/50 p-4">
                        <div className="relative flex flex-col items-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 font-mono text-sm text-primary">
                            {index + 1}
                          </div>
                          {index < result.workflow.length - 1 ? <div className="mt-2 h-full w-px bg-gradient-to-b from-primary/60 via-primary/15 to-transparent" /> : null}
                        </div>
                        <div className="space-y-1 pt-1">
                          <p className="text-sm font-medium">{step}</p>
                          <p className="text-xs text-muted-foreground">
                            {index < result.workflow.length - 1 ? "完成该阶段后自动衔接到下一模块。" : "该步骤产出最终判断或执行结果。"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>

            <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {result.panels.map((panel) => {
                  const appearance = getToolAppearance(panel.tool)
                  const style = statusStyles[panel.status]
                  const Icon = appearance.icon

                  return (
                    <Card key={panel.id} className={cn("group overflow-hidden border-border/80 bg-card/80 transition-transform duration-200 hover:-translate-y-0.5", style.glow)}>
                      <div className={cn("h-1.5 w-full bg-gradient-to-r", style.stripe)} />
                      <CardHeader className="space-y-4 p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl ring-1", appearance.tint)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="truncate text-lg">{panel.title}</CardTitle>
                              <CardDescription className="mt-1 break-all">{panel.tool}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className={style.badge}>
                            {style.label}
                          </Badge>
                        </div>

                        <div className="rounded-[1.4rem] border border-white/6 bg-background/45 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">模块信号</span>
                            <span className="font-mono text-xs text-muted-foreground">{style.score}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/6">
                            <div className={cn("h-2 rounded-full bg-gradient-to-r", style.stripe)} style={{ width: `${style.score}%` }} />
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{panel.summary}</p>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
                        {panel.metrics.length > 0 ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {panel.metrics.map((metric) => (
                              <div key={`${panel.id}-${metric.label}`} className="rounded-[1.2rem] border border-border/70 bg-background/45 p-3">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
                                <p className="mt-2 text-sm font-medium">{metric.value}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className={appearance.chip}>
                            {panel.tool}
                          </Badge>
                          <Badge variant="outline" className="border-border/70 bg-background/50 text-muted-foreground">
                            {panel.items.length} 条操作
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          {panel.items.map((item, index) => (
                            <div key={`${panel.id}-${index}`} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background text-xs font-medium text-muted-foreground">
                                {index + 1}
                              </div>
                              <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </section>
            </>
          ) : (
            <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {workflows.map((workflow) => {
                const Icon = workflow.icon
                const isRecommended = workflow.key === recommended.key

                return (
                  <Card
                    key={workflow.key}
                    className={cn(
                      "overflow-hidden border-border/80 bg-card/80 transition-all",
                      isRecommended && "border-primary/35 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_18px_40px_rgba(16,185,129,0.08)]"
                    )}
                  >
                    <div className={cn("h-1.5 w-full bg-gradient-to-r", workflow.accent)} />
                    <CardHeader>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background/60 text-primary ring-1 ring-border/70">
                          <Icon className="h-5 w-5" />
                        </div>
                        {isRecommended ? (
                          <Badge variant="outline" className="border-primary/30 text-primary">
                            推荐
                          </Badge>
                        ) : null}
                      </div>
                      <CardTitle>{workflow.title}</CardTitle>
                      <CardDescription>{workflow.subtitle}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {workflow.steps.map((step, index) => (
                          <div key={step} className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background text-xs font-medium text-muted-foreground">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{step}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {index < workflow.steps.length - 1 ? "自动衔接到下一阶段" : "产出最终分析或可执行交易"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
