"use client"

import { AIChatWidget } from "@/components/ai-chat-widget"
import { useAccount } from "wagmi"
import { useState, useCallback } from "react"
import { Navbar } from "@/components/navbar"
import { SearchBox } from "@/components/search-box"
import { SearchResults, type SearchResult } from "@/components/search-results"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Zap, Wallet, ShieldCheck } from "lucide-react"
import { requestPaidSearch } from "@/lib/request-paid-answer"

const PRICE_LABEL = process.env.NEXT_PUBLIC_X402_PRICE_DISPLAY || "0.01 USDC / 次"

export default function Home() {
  const { isConnected, address } = useAccount()
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [summary, setSummary] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string>("")

  const handleSearch = useCallback(
    async (query: string) => {
      if (!isConnected || !address) {
        setError("请先连接钱包，x402 支付完成后才会返回结果。")
        return
      }

      setIsSearching(true)
      setError("")

      try {
        const data = await requestPaidSearch(query, address)
        setSearchResults(data.results || [])
        setSummary(data.summary || data.answer || "")
        setHasSearched(true)
      } catch (error: any) {
        setError(error?.message || "搜索失败")
      } finally {
        setIsSearching(false)
      }
    },
    [address, isConnected]
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {!hasSearched ? (
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="flex w-full max-w-3xl flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-balance text-center text-4xl font-bold tracking-tight text-foreground sm:text-5xl">X402 Search</h1>
              <p className="max-w-2xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
                体验最先进的Ai+X402+OnchainOS系统
              </p>
            </div>

            <SearchBox onSearch={handleSearch} isSearching={isSearching} disabled={isSearching} size="large" />

            {error ? (
              <Alert className="w-full border-destructive/40 bg-destructive/5 text-left">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="border-border font-mono text-muted-foreground">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  OKX X402 API
                </Badge>
                <Badge variant="outline" className="border-primary/30 font-mono text-primary">{PRICE_LABEL}</Badge>
                <Badge variant="outline" className="border-border font-mono text-muted-foreground">X Layer</Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                {isConnected && address ? (
                  <span className="inline-flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    {address}
                  </span>
                ) : (
                  "请先连接支持签名的 EVM 钱包"
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1">
          <div className="sticky top-16 z-40 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <SearchBox onSearch={handleSearch} isSearching={isSearching} disabled={isSearching} />
              </div>
              <Badge variant="outline" className="shrink-0 border-primary/30 font-mono text-primary">{PRICE_LABEL}</Badge>
            </div>
          </div>

          <div className="mx-auto max-w-3xl px-4 py-6">
            {error ? (
              <Alert className="mb-4 border-destructive/40 bg-destructive/5 text-left">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <SearchResults results={searchResults} summary={summary} hasSearched={hasSearched} />
          </div>
        </main>
      )}

      <footer className="border-t border-border py-5 text-center text-sm text-muted-foreground">
        <p>
          Powered by <span className="font-semibold text-primary">x402</span> and <span className="font-semibold text-foreground">OKX OnchainOS</span>
        </p>
      </footer>
      <AIChatWidget />
    </div>
  )
}
