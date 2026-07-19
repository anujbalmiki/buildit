"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { ResumeData, ResumeSection } from "@/types/resume"
import { CheckCircle2, Loader2, SpellCheck } from "lucide-react"
import { useState } from "react"

interface ProofreadProps {
  resumeData: ResumeData
  updateResumeData: (updates: Partial<ResumeData>) => void
}

interface Issue {
  original: string
  suggestion: string
  reason: string
}

// Replace the first field that contains `original` with `suggestion`.
// Returns the new sections and whether anything changed (immutably).
function replaceFirst(sections: ResumeSection[], original: string, suggestion: string) {
  let applied = false
  const next = sections.map((s) => {
    if (applied) return s
    if (s.type === "paragraph" && s.content && s.content.includes(original)) {
      applied = true
      return { ...s, content: s.content.replace(original, suggestion) }
    }
    if (s.type === "experience" || s.type === "project") {
      const items = (s.items || []).map((it: any) => {
        if (applied) return it
        const bullets: string[] = it.bullet_points || []
        const idx = bullets.findIndex((b) => b && b.includes(original))
        if (idx >= 0) {
          applied = true
          const nb = [...bullets]
          nb[idx] = nb[idx].replace(original, suggestion)
          return { ...it, bullet_points: nb }
        }
        return it
      })
      return { ...s, items }
    }
    if (s.type === "education") {
      const items = (s.items || []).map((it: any) => {
        if (applied) return it
        if (it.details && it.details.includes(original)) {
          applied = true
          return { ...it, details: it.details.replace(original, suggestion) }
        }
        return it
      })
      return { ...s, items }
    }
    return s
  })
  return { sections: next, applied }
}

export default function Proofread({ resumeData, updateResumeData }: ProofreadProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [issues, setIssues] = useState<Issue[] | null>(null)

  const runCheck = async () => {
    setLoading(true)
    setIssues(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/proofread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeData),
      })
      if (!res.ok) throw new Error("failed")
      const data = await res.json()
      setIssues(data.issues || [])
    } catch {
      toast({ title: "Error", description: "Couldn't run the proofreading check. Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const applyOne = (issue: Issue) => {
    const { sections, applied } = replaceFirst(resumeData.sections || [], issue.original, issue.suggestion)
    if (applied) updateResumeData({ sections })
    setIssues((prev) => (prev ? prev.filter((i) => i !== issue) : prev))
  }

  const applyAll = () => {
    let secs = resumeData.sections || []
    const remaining: Issue[] = []
    for (const issue of issues || []) {
      const res = replaceFirst(secs, issue.original, issue.suggestion)
      if (res.applied) secs = res.sections
      else remaining.push(issue)
    }
    updateResumeData({ sections: secs })
    setIssues(remaining)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold">Spelling &amp; grammar</span>
        {issues && issues.length > 0 && (
          <Button size="sm" variant="outline" onClick={applyAll}>
            Apply all ({issues.length})
          </Button>
        )}
      </div>

      <Button onClick={runCheck} disabled={loading} variant="outline">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SpellCheck className="mr-2 h-4 w-4" />}
        {loading ? "Checking…" : "Check spelling & grammar"}
      </Button>

      {issues !== null && issues.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> No spelling or grammar issues found.
        </div>
      )}

      {issues && issues.length > 0 && (
        <ul className="space-y-2">
          {issues.map((issue, i) => (
            <li key={i} className="rounded-md border border-border p-3 text-sm">
              <div className="mb-2">
                <span className="text-red-600 line-through dark:text-red-400">{issue.original}</span>
                <span className="mx-1 text-muted-foreground">→</span>
                <span className="text-emerald-600 dark:text-emerald-400">{issue.suggestion}</span>
              </div>
              {issue.reason && <p className="mb-2 text-xs text-muted-foreground">{issue.reason}</p>}
              <Button size="sm" variant="outline" onClick={() => applyOne(issue)}>
                Apply
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
