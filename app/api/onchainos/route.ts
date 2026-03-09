import { NextRequest, NextResponse } from "next/server"
import { askOpenClaw } from "@/lib/openclaw"
import { buildOnchainOSPrompt, detectOnchainOSMode, normalizeOnchainOSResponse } from "@/lib/onchainos"
import { createPaidResponseHeaders, createPaymentHeaders, verifyAndSettlePayment } from "@/lib/x402-route"
import { createUuid } from "@/lib/uuid"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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

    const prompt = buildOnchainOSPrompt(query, detectOnchainOSMode(query))
    const sessionKey = `onchainos-${createUuid()}`
    const { text } = await askOpenClaw(prompt, sessionKey)
    const payload = normalizeOnchainOSResponse(query, text)

    return NextResponse.json(
      {
        ...payload,
        payer: verified.payer,
        settlement: settled,
      },
      { status: 200, headers: createPaidResponseHeaders(settled) }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "onchainos failed" }, { status: 500 })
  }
}
