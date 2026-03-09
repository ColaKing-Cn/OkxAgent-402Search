"use client"

import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBoxProps {
  onSearch: (query: string) => void
  isSearching: boolean
  disabled: boolean
  size?: "default" | "large"
}

export function SearchBox({ onSearch, isSearching, disabled, size = "default" }: SearchBoxProps) {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !disabled) {
      onSearch(query.trim())
    }
  }

  const isLarge = size === "large"

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-3">
      <div className="relative flex-1">
        <Search
          className={`absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground ${
            isLarge ? "h-5 w-5" : "h-4 w-4"
          }`}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入你想搜索的内容..."
          className={`border-border bg-input pl-12 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary ${
            isLarge
              ? "h-14 rounded-2xl text-lg sm:h-16 sm:text-xl"
              : "h-12 text-base"
          }`}
          disabled={disabled}
        />
      </div>
      <Button
        type="submit"
        disabled={disabled || !query.trim() || isSearching}
        className={`bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 ${
          isLarge
            ? "h-14 min-w-[120px] rounded-2xl text-base sm:h-16 sm:min-w-[140px] sm:text-lg"
            : "h-12 min-w-[100px]"
        }`}
      >
        {isSearching ? (
          <Loader2 className={`animate-spin ${isLarge ? "h-5 w-5" : "h-4 w-4"}`} />
        ) : (
          "搜索"
        )}
      </Button>
    </form>
  )
}
