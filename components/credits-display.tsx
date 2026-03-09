import { Badge } from "@/components/ui/badge"
import { ShieldCheck } from "lucide-react"

const PRICE_LABEL = process.env.NEXT_PUBLIC_X402_PRICE_DISPLAY || "0.01 USDC / 次"

export function CreditsDisplay() {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="border-primary/30 font-mono text-primary">
        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
        x402 按次支付
      </Badge>
      <Badge variant="outline" className="border-border font-mono text-muted-foreground">
        {PRICE_LABEL}
      </Badge>
    </div>
  )
}
