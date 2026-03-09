"use client"

import { ExternalLink, SearchX, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface SearchResult {
  id: string
  title: string
  description: string
  url: string
}

interface SearchResultsProps {
  results: SearchResult[]
  hasSearched: boolean
  summary?: string
}

export function SearchResults({ results, hasSearched, summary }: SearchResultsProps) {
  if (!hasSearched) return null

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <SearchX className="mb-4 h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">未找到搜索结果</p>
        <p className="mt-1 text-sm">请尝试其他搜索关键词</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {summary ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI 搜索摘要
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">找到 {results.length} 条结果</p>
      {results.map((result) => (
        <Card key={result.id} className="group border-border bg-card transition-colors hover:border-primary/30 hover:bg-secondary/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">{result.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{result.description}</p>
                <span className="mt-2 inline-block break-all font-mono text-xs text-primary/70">{result.url}</span>
              </div>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                aria-label={`访问 ${result.title}`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
