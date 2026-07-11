"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { AtsBand, AtsResult } from "@/lib/ats"
import { AlertCircle, CheckCircle2, ChevronDown, XCircle } from "lucide-react"
import { useState } from "react"

const BAND_TEXT: Record<AtsBand, string> = {
  strong: "text-emerald-600 dark:text-emerald-400",
  good: "text-green-600 dark:text-green-400",
  fair: "text-amber-600 dark:text-amber-400",
  poor: "text-red-600 dark:text-red-400",
}

const BAND_STROKE: Record<AtsBand, string> = {
  strong: "stroke-emerald-500",
  good: "stroke-green-500",
  fair: "stroke-amber-500",
  poor: "stroke-red-500",
}

export default function AtsScore({ result }: { result: AtsResult }) {
  const [expanded, setExpanded] = useState(false)
  const { score, band, summary, checks, topHints } = result

  const R = 34
  const CIRC = 2 * Math.PI * R
  const offset = CIRC * (1 - score / 100)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          {/* Score ring */}
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
              <circle cx="40" cy="40" r={R} fill="none" strokeWidth="8" className="stroke-muted" />
              <circle
                cx="40"
                cy="40"
                r={R}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={BAND_STROKE[band]}
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-bold leading-none ${BAND_TEXT[band]}`}>{score}</span>
              <span className="text-[10px] text-muted-foreground">/ 100</span>
            </div>
          </div>

          {/* Summary + top hints */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-semibold text-foreground">ATS Score</h3>
              <span className={`text-sm font-medium capitalize ${BAND_TEXT[band]}`}>{band}</span>
            </div>
            <p className="text-sm text-muted-foreground">{summary}</p>

            {topHints.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {topHints.slice(0, 3).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> All key ATS checks passed.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide full breakdown" : "Show full breakdown"}
        </button>

        {expanded && (
          <ul className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                {c.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                )}
                <span className="min-w-0">
                  <span className="text-foreground">{c.label}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    ({c.points}/{c.max})
                  </span>
                  {!c.passed && c.hint && <span className="block text-xs text-muted-foreground">{c.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
