import { NextResponse } from "next/server"
import { getSupportedNetworks } from "@/lib/okx-payments"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const data = await getSupportedNetworks()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load OKX x402 support info" },
      { status: 500 }
    )
  }
}
