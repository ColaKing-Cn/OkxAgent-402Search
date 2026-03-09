export type TavilySearchResult = {
  title?: string
  url?: string
  content?: string
  raw_content?: string
  score?: number
}

type TavilyResponse = {
  answer?: string
  query?: string
  results?: TavilySearchResult[]
}

const TAVILY_API_URL = process.env.TAVILY_API_URL || "https://api.tavily.com/search"
const VALID_TOPICS = new Set(["general", "news", "finance"])
const VALID_DEPTHS = new Set(["basic", "advanced", "fast", "ultra-fast"])

function getTopic() {
  const topic = (process.env.TAVILY_TOPIC || "general").trim().toLowerCase()
  return VALID_TOPICS.has(topic) ? topic : "general"
}

function getSearchDepth() {
  const depth = (process.env.TAVILY_SEARCH_DEPTH || "basic").trim().toLowerCase()
  return VALID_DEPTHS.has(depth) ? depth : "basic"
}

function getMaxResults() {
  const parsed = Number(process.env.TAVILY_MAX_RESULTS || "5")
  if (!Number.isFinite(parsed)) return 5
  return Math.min(20, Math.max(1, Math.trunc(parsed)))
}

export async function searchWeb(query: string) {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY")
  }

  const res = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      topic: getTopic(),
      max_results: getMaxResults(),
      include_answer: true,
      search_depth: getSearchDepth(),
    }),
    cache: "no-store",
  })

  const text = await res.text()
  let json: TavilyResponse

  try {
    json = JSON.parse(text) as TavilyResponse
  } catch {
    throw new Error(`Tavily API returned non-JSON: ${text}`)
  }

  if (!res.ok) {
    const details =
      typeof (json as any)?.error === "string"
        ? (json as any).error
        : text.slice(0, 400)
    throw new Error(`Tavily API error (${res.status}): ${details}`)
  }

  return json
}
