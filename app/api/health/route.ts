import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const url = (process.env.OPENCLAW_WS_URL || "ws://43.156.236.194:18789").replace("ws://", "http://").replace("wss://", "https://")

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    const resp = await fetch(url, {
      signal: controller.signal,
    })
    clearTimeout(timer)

    // gateway 返回任何响应都说明它在线
    return NextResponse.json({ online: true })
  } catch {
    return NextResponse.json({ online: false })
  }
}
