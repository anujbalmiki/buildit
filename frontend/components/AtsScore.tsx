"use client"

import type { AtsBand, AtsResult } from "@/lib/ats"
import { AlertCircle, CheckCircle2, ChevronDown, XCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"

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

const BAND_DOT: Record<AtsBand, string> = {
  strong: "bg-emerald-500",
  good: "bg-green-500",
  fair: "bg-amber-500",
  poor: "bg-red-500",
}

export default function AtsScore({ result }: { result: AtsResult }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { score, band, summary, checks, topHints } = result

  // Close the popover on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const R = 34
  const CIRC = 2 * Math.PI * R
  const offset = CIRC * (1 - score / 100)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        aria-expanded={open}
        aria-label="ATS score details"
      >
        <span className={`inline-block h-2 w-2 rounded-full ${BAND_DOT[band]}`} />
        <span>ATS {score}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg">
          <div className="flex items-center gap-4">
            {/* Score ring */}
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 80 80" className="h-16 w-16 -rotate-90">
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
                <span className={`text-lg font-bold leading-none ${BAND_TEXT[band]}`}>{score}</span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-semibold">ATS Score</h3>
                <span className={`text-xs font-medium capitalize ${BAND_TEXT[band]}`}>{band}</span>
              </div>
              <p className="text-xs text-muted-foreground">{summary}</p>
            </div>
          </div>

          {topHints.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {topHints.slice(0, 3).map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> All key ATS checks passed.
            </p>
          )}

          <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto border-t border-border pt-3">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-xs">
                {c.passed ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                )}
                <span className="min-w-0">
                  <span className="text-foreground">{c.label}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    ({c.points}/{c.max})
                  </span>
                  {!c.passed && c.hint && <span className="block text-[11px] text-muted-foreground">{c.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
