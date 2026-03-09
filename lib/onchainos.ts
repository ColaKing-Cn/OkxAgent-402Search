import { createUuid } from "@/lib/uuid"

export type OnchainOSMode = "address" | "keyword"
export type OnchainOSStatus = "ready" | "action" | "warning" | "complete"

export type OnchainOSMetric = {
  label: string
  value: string
}

export type OnchainOSPanel = {
  id: string
  title: string
  tool: string
  summary: string
  status: OnchainOSStatus
  items: string[]
  metrics: OnchainOSMetric[]
}

export type OnchainOSResponse = {
  query: string
  mode: OnchainOSMode
  summary: string
  recommendation: string
  workflow: string[]
  actions: string[]
  panels: OnchainOSPanel[]
}

type PartialPanel = Partial<Omit<OnchainOSPanel, "id">>

const addressPattern = /^0x[a-fA-F0-9]{40}$/

const defaultPanels: Record<OnchainOSMode, Array<Omit<OnchainOSPanel, "id">>> = {
  address: [
    {
      title: "代币识别",
      tool: "okx-dex-token",
      summary: "识别输入地址关联的代币、交易对和可交易方向。",
      status: "ready",
      items: ["检查地址是否为代币合约或持仓地址", "提取代币符号、流动性和交易对", "生成下一步换币候选"],
      metrics: [{ label: "模式", value: "地址识别" }],
    },
    {
      title: "资金检查",
      tool: "okx-wallet-portfolio",
      summary: "核对钱包余额、稳定币持仓和可用资金。",
      status: "action",
      items: ["读取钱包主要资产和稳定币余额", "检查是否满足预估交易金额", "标记需要补充授权或充值的资产"],
      metrics: [{ label: "检查项", value: "余额 / 持仓 / 可用额度" }],
    },
    {
      title: "交易执行",
      tool: "okx-dex-swap",
      summary: "基于识别结果生成 swap 路径并准备执行。",
      status: "warning",
      items: ["生成可执行兑换路径", "评估滑点、最小收到数量与路由", "等待用户签名和广播"],
      metrics: [{ label: "输出", value: "Swap 路径" }],
    },
  ],
  keyword: [
    {
      title: "市场研究",
      tool: "okx-dex-token",
      summary: "收集趋势、排名和候选代币。",
      status: "ready",
      items: ["抓取主题代币和相关赛道", "生成趋势列表和关注对象", "标出高波动和高热度标的"],
      metrics: [{ label: "模式", value: "研究关键词" }],
    },
    {
      title: "价格图表",
      tool: "okx-dex-market",
      summary: "补充 K 线、历史走势和关键价格区间。",
      status: "action",
      items: ["生成短周期与日线视图", "标记支撑阻力和近期波动", "提取历史高低点作为参考"],
      metrics: [{ label: "检查项", value: "K线 / 历史 / 波动" }],
    },
    {
      title: "交易建议",
      tool: "okx-dex-swap",
      summary: "为研究结果补上可执行交易路径。",
      status: "warning",
      items: ["筛选优先交易对", "给出入场、减仓或观望建议", "准备 swap 参数和风险提示"],
      metrics: [{ label: "输出", value: "交易建议" }],
    },
  ],
}

export function detectOnchainOSMode(query: string): OnchainOSMode {
  return addressPattern.test(query.trim()) ? "address" : "keyword"
}

export function buildOnchainOSPrompt(query: string, mode: OnchainOSMode) {
  const objective =
    mode === "address"
      ? "用户输入的是账户地址或合约地址。优先执行地址识别、投资组合检查和交易准备。"
      : "用户输入的是主题、代币名或市场研究关键词。优先执行趋势研究、市场图表分析和交易建议。"

  return `
你是 OnchainOS 调度器，需要通过 OpenClaw 编排 OKX 工具链，生成给前端消费的严格 JSON。

输入内容: ${query}
模式: ${mode}
目标: ${objective}

优先工具链:
1. okx-dex-token
2. okx-wallet-portfolio
3. okx-dex-market
4. okx-dex-swap
5. okx-onchain-gateway

请在工具可用时尽量按以下路径编排:
- 自动搜索与购买: okx-dex-token -> okx-wallet-portfolio -> okx-dex-swap
- 投资组合概览: okx-wallet-portfolio -> okx-dex-token -> okx-dex-market
- 市场研究: okx-dex-token -> okx-dex-market -> okx-dex-swap
- 交换和广播: okx-dex-swap -> 本地签名 -> okx-onchain-gateway 广播 -> okx-onchain-gateway 跟踪顺序
- 飞行前检查: okx-onchain-gateway 估算气体 -> 模拟发射 -> 广播 -> 跟踪顺序
- 完整交易流程: okx-dex-token 搜索 -> okx-dex-market 价格/图表 -> okx-wallet-portfolio 检查余额

输出必须是 JSON，不要 markdown，不要解释，不要代码块。
JSON 结构:
{
  "summary": "string",
  "recommendation": "string",
  "workflow": ["step1", "step2", "step3"],
  "actions": ["action1", "action2"],
  "panels": [
    {
      "title": "string",
      "tool": "okx-dex-token",
      "summary": "string",
      "status": "ready|action|warning|complete",
      "items": ["string"],
      "metrics": [
        { "label": "string", "value": "string" }
      ]
    }
  ]
}

要求:
- 至少返回 3 个 panels，最多 6 个
- 所有字符串使用简体中文
- 结合输入给出明确的下一步动作
- 如果某个工具当前不可用，也要在 summary 或 items 中说明应执行的检查，不要留空
`.trim()
}

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text)
  } catch {}

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null

  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

function normalizePanel(mode: OnchainOSMode, panel: PartialPanel, index: number): OnchainOSPanel {
  const fallback = defaultPanels[mode][index % defaultPanels[mode].length]
  const metrics = Array.isArray(panel.metrics)
    ? panel.metrics
        .filter((metric): metric is OnchainOSMetric => Boolean(metric?.label && metric?.value))
        .map((metric) => ({ label: String(metric.label), value: String(metric.value) }))
    : fallback.metrics

  return {
    id: createUuid(),
    title: typeof panel.title === "string" && panel.title.trim() ? panel.title.trim() : fallback.title,
    tool: typeof panel.tool === "string" && panel.tool.trim() ? panel.tool.trim() : fallback.tool,
    summary: typeof panel.summary === "string" && panel.summary.trim() ? panel.summary.trim() : fallback.summary,
    status:
      panel.status === "ready" || panel.status === "action" || panel.status === "warning" || panel.status === "complete"
        ? panel.status
        : fallback.status,
    items:
      Array.isArray(panel.items) && panel.items.length > 0
        ? panel.items.map((item) => String(item))
        : fallback.items,
    metrics,
  }
}

export function normalizeOnchainOSResponse(query: string, rawText: string): OnchainOSResponse {
  const mode = detectOnchainOSMode(query)
  const parsed = tryParseJson(rawText)
  const fallbackPanels = defaultPanels[mode].map((panel, index) => normalizePanel(mode, panel, index))

  if (!parsed || typeof parsed !== "object") {
    return {
      query,
      mode,
      summary: `OpenClaw 已接收“${query}”的请求，但返回内容不是结构化 JSON，已降级为默认 OnchainOS 执行面板。`,
      recommendation: mode === "address" ? "优先检查钱包余额与目标代币是否可交易。" : "先做市场研究，再决定是否进入 swap。",
      workflow: fallbackPanels.map((panel) => `${panel.tool} ${panel.title}`),
      actions: ["检查 OpenClaw 工具是否已启用", "重新发起分析以获取结构化结果"],
      panels: fallbackPanels,
    }
  }

  const panels =
    Array.isArray(parsed.panels) && parsed.panels.length > 0
      ? (parsed.panels as PartialPanel[]).slice(0, 6).map((panel: PartialPanel, index: number) => normalizePanel(mode, panel, index))
      : fallbackPanels

  return {
    query,
    mode,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : `已为“${query}”生成 OnchainOS 编排结果。`,
    recommendation:
      typeof parsed.recommendation === "string" && parsed.recommendation.trim()
        ? parsed.recommendation.trim()
        : mode === "address"
          ? "优先检查持仓和交易可执行性。"
          : "优先完成市场研究和价格确认。",
    workflow:
      Array.isArray(parsed.workflow) && parsed.workflow.length > 0
        ? parsed.workflow.map((item: unknown) => String(item))
        : panels.map((panel) => `${panel.tool} ${panel.title}`),
    actions:
      Array.isArray(parsed.actions) && parsed.actions.length > 0
        ? parsed.actions.map((item: unknown) => String(item))
        : ["查看每个模块的风险与下一步动作"],
    panels,
  }
}
