"use client"

import type { Address, Hex } from "viem"
import { parseAbi, createPublicClient, http } from "viem"
import { getWalletClient, switchChain } from "wagmi/actions"
import { wagmiConfig, xLayer } from "@/lib/wagmi"

export type ClientPaymentRequirements = {
  scheme: "exact"
  chainIndex: string
  maxAmountRequired: string
  payTo: Address
  asset?: Address
  maxTimeoutSeconds?: number
  extra?: {
    name?: string
    eip3009Version?: string
  }
}

export type ClientPaymentRequiredEnvelope = {
  x402Version: number
  accepts: ClientPaymentRequirements[]
}

const erc20MetadataAbi = parseAbi(["function name() view returns (string)"])

function randomNonce(): Hex {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

export function parsePaymentRequiredHeader(header: string): ClientPaymentRequiredEnvelope {
  const json = atob(header)
  return JSON.parse(json) as ClientPaymentRequiredEnvelope
}

async function ensureXLayerSelected() {
  try {
    await switchChain(wagmiConfig, { chainId: xLayer.id })
  } catch (error: any) {
    throw new Error(error?.shortMessage || error?.message || "请先将钱包切换到 X Layer")
  }
}

export async function createPaymentHeader(address: Address, requirement: ClientPaymentRequirements): Promise<string> {
  if (!requirement.asset) {
    throw new Error("Payment requirement is missing the asset contract")
  }

  await ensureXLayerSelected()

  const walletClient = await getWalletClient(wagmiConfig)
  const publicClient = createPublicClient({
    chain: xLayer,
    transport: http("https://rpc.xlayer.tech"),
  })

  const tokenName =
    requirement.extra?.name ||
    (await publicClient.readContract({
      address: requirement.asset,
      abi: erc20MetadataAbi,
      functionName: "name",
    }))

  const now = Math.floor(Date.now() / 1000)
  const authorization = {
    from: address,
    to: requirement.payTo,
    value: BigInt(requirement.maxAmountRequired),
    validAfter: BigInt(now - 60),
    validBefore: BigInt(now + (requirement.maxTimeoutSeconds ?? 300)),
    nonce: randomNonce(),
  }

  if (!walletClient) {
    throw new Error("Wallet client is not available")
  }

  if (walletClient.chain?.id !== xLayer.id) {
    throw new Error(`钱包当前链不是 X Layer，当前为 ${walletClient.chain?.name || walletClient.chain?.id || "unknown"}`)
  }

  const signature = await walletClient.signTypedData({
    account: address,
    domain: {
      name: tokenName,
      version: requirement.extra?.eip3009Version || "2",
      chainId: xLayer.id,
      verifyingContract: requirement.asset,
    },
    primaryType: "TransferWithAuthorization",
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    message: authorization,
  })

  const payload = {
    x402Version: 1,
    scheme: requirement.scheme,
    chainIndex: requirement.chainIndex,
    payload: {
      signature,
      authorization: {
        ...authorization,
        value: authorization.value.toString(),
        validAfter: authorization.validAfter.toString(),
        validBefore: authorization.validBefore.toString(),
      },
    },
  }

  return btoa(JSON.stringify(payload))
}
