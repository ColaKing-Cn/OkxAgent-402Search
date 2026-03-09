import { NextRequest, NextResponse } from "next/server"
import { createUuid } from "@/lib/uuid"
import { createPaidResponseHeaders, createPaymentHeaders, verifyAndSettlePayment } from "@/lib/x402-route"
import { searchWeb } from "@/lib/tavily"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SearchResult = {
  id: string
  title: string
  description: string
  url: string
}

function normalizeResults(query: string, answer: string | undefined, results: Array<{ title?: string; content?: string; url?: string }>) {
  const normalized: SearchResult[] = results
    .map((item) => ({
      id: createUuid(),
      title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : query,
      description: typeof item.content === "string" && item.content.trim() ? item.content.trim() : "暂无摘要",
      url: typeof item.url === "string" && item.url.trim() ? item.url.trim() : "https://example.com/not-available",
    }))
    .filter((item) => Boolean(item.title && item.description && item.url))

  return {
    summary: answer?.trim() || `已为“${query}”抓取真实网页搜索结果。`,
    results: normalized,
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "missing query" }, { status: 400 })
    }

    const resource = `${req.nextUrl.origin}${req.nextUrl.pathname}`
    const { requirement, headers } = createPaymentHeaders(resource)
    const paymentHeader = req.headers.get("payment-signature") || req.headers.get("x-payment")

    if (!paymentHeader) {
      return NextResponse.json(
        { error: "Payment Required", paymentRequirements: [requirement] },
        { status: 402, headers }
      )
    }

    const { verified, settled } = await verifyAndSettlePayment(paymentHeader, requirement)

    if (!verified.isValid) {
      return NextResponse.json({ error: verified.invalidReason || "Payment verification failed" }, { status: 402, headers })
    }

    if (!settled?.success) {
      return NextResponse.json({ error: settled?.errorReason || "Payment settlement failed" }, { status: 402, headers })
    }

    const search = await searchWeb(query)
    const normalized = normalizeResults(query, search.answer, search.results || [])

    return NextResponse.json(
      {
        query,
        answer: search.answer || normalized.summary,
        ...normalized,
        payer: verified.payer,
        settlement: settled,
      },
      { status: 200, headers: createPaidResponseHeaders(settled) }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "search failed" }, { status: 500 })
  }
}
