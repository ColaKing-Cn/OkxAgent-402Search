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
      topic: process.env.TAVILY_TOPIC || "general",
      max_results: Number(process.env.TAVILY_MAX_RESULTS || "5"),
      include_answer: true,
      search_depth: process.env.TAVILY_SEARCH_DEPTH || "basic",
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
    throw new Error((json as any)?.error || `Tavily API error (${res.status})`)
  }

  return json
}
