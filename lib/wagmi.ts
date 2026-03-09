import { createConfig, http } from "wagmi"
import { injected } from "wagmi/connectors"
import { defineChain } from "viem"

export const xLayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.xlayer.tech"],
    },
    public: {
      http: ["https://rpc.xlayer.tech"],
    },
  },
  blockExplorers: {
    default: {
      name: "OKLink X Layer Explorer",
      url: "https://www.oklink.com/xlayer",
    },
  },
})

export const wagmiConfig = createConfig({
  chains: [xLayer],
  connectors: [injected()],
  transports: {
    [xLayer.id]: http("https://rpc.xlayer.tech"),
  },
})
