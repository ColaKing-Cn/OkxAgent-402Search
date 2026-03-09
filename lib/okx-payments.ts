import crypto from "crypto"
import { X402_CHAIN_INDEX, X402_VERSION, type PaymentPayload, type PaymentRequirements } from "@/lib/x402"

const OKX_BASE_URL = process.env.OKX_API_BASE_URL || "https://web3.okx.com"
const SUPPORTED_PATH = "/api/v6/x402/supported"
const VERIFY_PATH = "/api/v6/x402/verify"
const SETTLE_PATH = "/api/v6/x402/settle"

type OkxEnvelope<T> = {
  code: string
  msg: string
  data: T[]
}

type VerifyResult = {
  isValid: boolean
  payer?: string
  invalidReason?: string | null
}

type SettleResult = {
  success: boolean
  payer?: string
  txHash?: string
  chainIndex?: string
  chainName?: string
  errorReason?: string | null
}

type SupportedResult = {
  x402Version: number
  scheme: string
  chainIndex: string
  chainName: string
}

type AuthMode = "ok-access" | "bearer" | "both"

function getOkAccessHeaders(method: string, path: string, body: string) {
  const apiKey = process.env.OKX_API_KEY
  const secretKey = process.env.OKX_API_SECRET
  const passphrase = process.env.OKX_API_PASSPHRASE

  if (!apiKey || !secretKey || !passphrase) {
    throw new Error("Missing OKX_API_KEY / OKX_API_SECRET / OKX_API_PASSPHRASE")
  }

  const timestamp = new Date().toISOString()
  const prehash = `${timestamp}${method.toUpperCase()}${path}${body}`
  const sign = crypto.createHmac("sha256", secretKey).update(prehash).digest("base64")

  return {
    "OK-ACCESS-KEY": apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": passphrase,
  }
}

function getBearerHeaders() {
  const token = process.env.OKX_PAYMENTS_BEARER_TOKEN || process.env.OKX_BEARER_TOKEN
  if (!token) {
    throw new Error("Missing OKX_PAYMENTS_BEARER_TOKEN for OKX verify API")
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

function buildHeaders(method: "GET" | "POST", path: string, authMode: AuthMode, bodyString: string) {
  const base = { "Content-Type": "application/json" }

  if (authMode === "ok-access") {
    return { ...base, ...getOkAccessHeaders(method, path, bodyString) }
  }
  if (authMode === "bearer") {
    return { ...base, ...getBearerHeaders() }
  }
  return { ...base, ...getOkAccessHeaders(method, path, bodyString), ...getBearerHeaders() }
}

async function requestOnce<T>(method: "GET" | "POST", path: string, authMode: AuthMode, body?: Record<string, unknown>) {
  const bodyString = body ? JSON.stringify(body) : ""
  const headers = buildHeaders(method, path, authMode, bodyString)
  const res = await fetch(`${OKX_BASE_URL}${path}`, {
    method,
    headers,
    body: bodyString || undefined,
    cache: "no-store",
  })

  const text = await res.text()
  let json: OkxEnvelope<T> | null = null

  try {
    json = JSON.parse(text) as OkxEnvelope<T>
  } catch {
    if (!res.ok) {
      throw new Error(`${method} ${path} [${authMode}] -> ${res.status} ${text || res.statusText}`)
    }
    throw new Error(`OKX API returned non-JSON from ${path} [${authMode}]: ${text}`)
  }

  if (!res.ok || json.code !== "0" || !Array.isArray(json.data)) {
    throw new Error(json.msg || `${method} ${path} [${authMode}] -> ${res.status}`)
  }

  return json.data
}

export async function getSupportedNetworks() {
  return requestOnce<SupportedResult>("GET", SUPPORTED_PATH, "ok-access")
}

export async function verifyPayment(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements) {
  const [result] = await requestOnce<VerifyResult>("POST", VERIFY_PATH, "ok-access", {
    x402Version: X402_VERSION,
    chainIndex: X402_CHAIN_INDEX,
    paymentPayload,
    paymentRequirements,
  })

  if (!result) throw new Error("OKX verify returned empty data")
  return result
}

export async function settlePayment(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements) {
  const [result] = await requestOnce<SettleResult>("POST", SETTLE_PATH, "ok-access", {
    x402Version: X402_VERSION,
    chainIndex: X402_CHAIN_INDEX,
    paymentPayload,
    paymentRequirements,
  })

  if (!result) throw new Error("OKX settle returned empty data")
  return result
}
