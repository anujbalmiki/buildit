"use client"

import { computeJobMatch } from "@/lib/ats"
import type { ResumeData, ResumeSection } from "@/types/resume"
import { Check, Plus } from "lucide-react"
import { useMemo } from "react"

interface JobMatchProps {
  resumeData: ResumeData
  jobDescription: string
  updateResumeData: (updates: Partial<ResumeData>) => void
}

const DEFAULT_TF = { alignment: "left", font_size: 16, font_weight: "bold" } as const
const DEFAULT_CF = { alignment: "left", font_size: 14, font_weight: "normal" } as const

export default function JobMatch({ resumeData, jobDescription, updateResumeData }: JobMatchProps) {
  const match = useMemo(() => computeJobMatch(resumeData, jobDescription), [resumeData, jobDescription])

  if (!match.hasJd) return null

  // Add a missing keyword to the resume's skills. Appends to the first skills
  // (bullet_points) section, or creates one if there isn't any.
  const addKeyword = (kw: string) => {
    const sections = resumeData.sections || []
    const idx = sections.findIndex((s) => s.type === "bullet_points")
    if (idx >= 0) {
      const items = [...(sections[idx].items || []), kw]
      updateResumeData({ sections: sections.map((s, i) => (i === idx ? { ...s, items } : s)) })
    } else {
      const newSection: ResumeSection = {
        type: "bullet_points",
        title: "Skills",
        items: [kw],
        title_formatting: { ...DEFAULT_TF },
        content_formatting: { ...DEFAULT_CF },
      }
      updateResumeData({ sections: [...sections, newSection] })
    }
  }

  const color =
    match.score >= 75 ? "text-emerald-500" : match.score >= 50 ? "text-amber-500" : "text-red-500"
  const barColor =
    match.score >= 75 ? "bg-emerald-500" : match.score >= 50 ? "bg-amber-500" : "bg-red-500"

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Job match</p>
          <p className="text-xs text-muted-foreground">How many of this role&apos;s key terms your resume already uses.</p>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${color}`}>{match.score}%</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${match.score}%` }} />
      </div>

      {match.missing.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Missing keywords — click one to add it to your skills:
          </p>
          <div className="flex flex-wrap gap-2">
            {match.missing.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => addKeyword(kw)}
                title={`Add "${kw}" to your skills`}
                className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
              >
                <Plus className="h-3 w-3" /> {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {match.matched.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Already covered:</p>
          <div className="flex flex-wrap gap-2">
            {match.matched.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700 dark:text-emerald-300"
              >
                <Check className="h-3 w-3" /> {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        A guide, not a guarantee — keywords are matched loosely, so review before relying on the score.
      </p>
    </div>
  )
}
