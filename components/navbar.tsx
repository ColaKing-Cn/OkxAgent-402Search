"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Bot, Search, LogOut, Wallet, Waypoints } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAccount, useConnect, useDisconnect } from "wagmi"

export function Navbar() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  const ready = mounted
  const connected = ready && isConnected
  const truncatedAddress = connected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">X402 Search</span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              搜索
            </Link>
            <Link
              href="/onchainos"
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Waypoints className="h-3.5 w-3.5" />
              OnchainOS查询
            </Link>
            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Bot className="h-3.5 w-3.5" />
              AI助手
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {connected ? (
            <>
              <div className="hidden items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 sm:flex">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-mono text-sm text-foreground">{truncatedAddress}</span>
              </div>

              <Button variant="ghost" size="sm" onClick={() => disconnect()} className="text-muted-foreground hover:text-foreground">
                <LogOut className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">断开连接</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                const okx = connectors.find((c) => (c.name || "").toLowerCase().includes("okx")) ?? connectors[0]
                connect({ connector: okx })
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Wallet className="mr-2 h-4 w-4" />
              连接 OKX 钱包
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
