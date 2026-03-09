import { randomBytes } from "crypto"

export const X402_VERSION = 1
export const X402_CHAIN_INDEX = process.env.X402_CHAIN_INDEX || "196"
export const X402_CHAIN_ID = Number(process.env.NEXT_PUBLIC_X402_CHAIN_ID || X402_CHAIN_INDEX)
export const X402_SCHEME = "exact"

export type PaymentRequirements = {
  scheme: "exact"
  chainIndex: string
  maxAmountRequired: string
  resource?: string
  description?: string
  mimeType?: string
  outputSchema?: Record<string, unknown>
  payTo: string
  maxTimeoutSeconds?: number
  asset?: string
  extra?: Record<string, unknown>
}

export type PaymentAuthorization = {
  from: `0x${string}`
  to: `0x${string}`
  value: string
  validAfter: string
  validBefore: string
  nonce: `0x${string}`
}

export type PaymentPayload = {
  x402Version: number
  scheme: "exact"
  chainIndex: string
  payload: {
    signature: `0x${string}`
    authorization: PaymentAuthorization
  }
}

export type PaymentRequiredEnvelope = {
  x402Version: number
  accepts: PaymentRequirements[]
}

export function getX402Config() {
  const payTo = process.env.X402_PAY_TO || process.env.NEXT_PUBLIC_PAY_TO
  const asset = process.env.X402_ASSET || process.env.NEXT_PUBLIC_USDC_CONTRACT
  const amount = process.env.X402_PRICE_BASE_UNITS || "10000"
  const timeoutSeconds = Number(process.env.X402_MAX_TIMEOUT_SECONDS || "300")

  if (!payTo) {
    throw new Error("Missing X402_PAY_TO or NEXT_PUBLIC_PAY_TO")
  }

  return {
    payTo: payTo as `0x${string}`,
    asset: asset as `0x${string}` | undefined,
    amount,
    timeoutSeconds,
    assetName: process.env.NEXT_PUBLIC_X402_ASSET_NAME || "USD Coin",
    assetVersion: process.env.NEXT_PUBLIC_X402_ASSET_VERSION || "2",
  }
}

export function buildPaymentRequirements(resource: string): PaymentRequirements {
  const config = getX402Config()

  return {
    scheme: X402_SCHEME,
    chainIndex: X402_CHAIN_INDEX,
    maxAmountRequired: config.amount,
    resource,
    description: "Paid access to the AI search endpoint",
    mimeType: "application/json",
    outputSchema: {
      answer: "string",
    },
    payTo: config.payTo,
    maxTimeoutSeconds: config.timeoutSeconds,
    asset: config.asset,
    extra: {
      name: config.assetName,
      eip3009Version: config.assetVersion,
      primaryType: "TransferWithAuthorization",
    },
  }
}

export function encodePaymentRequired(requirements: PaymentRequirements[]): string {
  return Buffer.from(
    JSON.stringify({ x402Version: X402_VERSION, accepts: requirements } satisfies PaymentRequiredEnvelope),
    "utf8"
  ).toString("base64")
}

export function encodePaymentResponse(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64")
}

export function decodePaymentHeader(header: string): PaymentPayload {
  const json = Buffer.from(header, "base64").toString("utf8")
  return JSON.parse(json) as PaymentPayload
}

export function buildClientAuthorization(args: {
  from: `0x${string}`
  to: `0x${string}`
  value: string
  timeoutSeconds: number
}): PaymentAuthorization {
  const now = Math.floor(Date.now() / 1000)

  return {
    from: args.from,
    to: args.to,
    value: args.value,
    validAfter: String(now - 60),
    validBefore: String(now + args.timeoutSeconds),
    nonce: `0x${randomBytes(32).toString("hex")}`,
  }
}

export const transferWithAuthorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const
