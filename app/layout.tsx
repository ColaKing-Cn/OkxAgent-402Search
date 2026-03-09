import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "X402 Search - Web3 Powered Search",
  description: "Per-request x402 search powered by USDC on X Layer and OKX OnchainOS.",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
