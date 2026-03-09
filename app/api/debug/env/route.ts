import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({
    okxApiBaseUrl: process.env.OKX_API_BASE_URL || null,
    hasOkxApiKey: Boolean(process.env.OKX_API_KEY),
    hasOkxApiSecret: Boolean(process.env.OKX_API_SECRET),
    hasOkxApiPassphrase: Boolean(process.env.OKX_API_PASSPHRASE),
    hasOkxPaymentsBearer: Boolean(process.env.OKX_PAYMENTS_BEARER_TOKEN || process.env.OKX_BEARER_TOKEN),
    hasPayTo: Boolean(process.env.X402_PAY_TO || process.env.NEXT_PUBLIC_PAY_TO),
    hasAsset: Boolean(process.env.X402_ASSET || process.env.NEXT_PUBLIC_USDC_CONTRACT),
    hasTavilyApiKey: Boolean(process.env.TAVILY_API_KEY),
  })
}
