import { Info, CircleDollarSign, ShieldCheck, Globe, Coins } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const PRICE_LABEL = process.env.NEXT_PUBLIC_X402_PRICE_DISPLAY || "0.01 USDC / 次"

export function BillingInfo() {
  const items = [
    { icon: CircleDollarSign, text: `按次支付：${PRICE_LABEL}` },
    { icon: ShieldCheck, text: "支付流程：HTTP 402 + x402 exact + OKX X402 API" },
    { icon: Globe, text: "网络：X Layer" },
    { icon: Coins, text: "支付资产：USDC（按 x402 payment requirements 动态确定）" },
  ]

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Info className="h-4 w-4 text-primary" />
          支付说明
        </CardTitle>
      </CardHeader>
      <Separator className="bg-border" />
      <CardContent className="pt-4">
        <ul className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
              <span className="text-sm leading-relaxed text-muted-foreground">{item.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
