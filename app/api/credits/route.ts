import { NextResponse } from "next/server"

const creditsStore =
  (globalThis as any).__creditsStore ?? new Map<string, number>()
;(globalThis as any).__creditsStore = creditsStore

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "missing address" }, { status: 400 })
  }

  const key = address.toLowerCase()
  const creditsLeft = creditsStore.get(key) ?? 0

  return NextResponse.json({ creditsLeft })
}