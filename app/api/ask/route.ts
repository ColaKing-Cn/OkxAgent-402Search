import { NextRequest, NextResponse } from "next/server"
import { askOpenClaw } from "@/lib/openclaw"
import { createUuid } from "@/lib/uuid"
import { createPaidResponseHeaders, createPaymentHeaders, verifyAndSettlePayment } from "@/lib/x402-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { question, address } = await req.json()

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "missing question" }, { status: 400 })
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

    const sessionKey = address ? `web:${String(address).toLowerCase()}` : `web:guest:${verified.payer || createUuid()}`
    const { text } = await askOpenClaw(question, sessionKey)

    return NextResponse.json(
      { answer: text, payer: verified.payer, settlement: settled },
      { status: 200, headers: createPaidResponseHeaders(settled) }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "ask failed" }, { status: 500 })
  }
}
