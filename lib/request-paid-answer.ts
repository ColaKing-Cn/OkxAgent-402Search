"use client"

import type { Address } from "viem"
import { createPaymentHeader, parsePaymentRequiredHeader } from "@/lib/x402-client"

async function requestPaidJson<T>(endpoint: string, payload: Record<string, unknown>, address?: Address): Promise<T> {
  const baseBody = JSON.stringify(payload)

  const first = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: baseBody,
  })

  if (first.status !== 402) {
    const data = await first.json()
    if (!first.ok) throw new Error(data?.error || "请求失败")
    return data as T
  }

  if (!address) {
    throw new Error("该接口需要连接钱包后完成 x402 支付")
  }

  const paymentRequired = first.headers.get("payment-required")
  if (!paymentRequired) {
    const data = await first.json().catch(() => null)
    throw new Error(data?.error || "服务端未返回 x402 payment requirements")
  }

  const envelope = parsePaymentRequiredHeader(paymentRequired)
  const requirement = envelope.accepts[0]
  if (!requirement) {
    throw new Error("未找到可用的支付方案")
  }

  const paymentSignature = await createPaymentHeader(address, requirement)

  const second = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "payment-signature": paymentSignature,
    },
    body: baseBody,
  })

  const data = await second.json()
  if (!second.ok) throw new Error(data?.error || "支付后请求失败")
  return data as T
}

export async function requestPaidAnswer(question: string, address?: Address) {
  return requestPaidJson<{ answer: string }>("/api/ask", { question, address }, address)
}

export type PaidSearchResponse = {
  query: string
  answer: string
  summary: string
  results: Array<{
    id: string
    title: string
    description: string
    url: string
  }>
}

export async function requestPaidSearch(query: string, address?: Address) {
  return requestPaidJson<PaidSearchResponse>("/api/search", { query, address }, address)
}

export type PaidOnchainOSResponse = {
  query: string
  mode: "address" | "keyword"
  summary: string
  recommendation: string
  workflow: string[]
  actions: string[]
  panels: Array<{
    id: string
    title: string
    tool: string
    summary: string
    status: "ready" | "action" | "warning" | "complete"
    items: string[]
    metrics: Array<{
      label: string
      value: string
    }>
  }>
}

export async function requestPaidOnchainOS(query: string, address?: Address) {
  return requestPaidJson<PaidOnchainOSResponse>("/api/onchainos", { query, address }, address)
}
