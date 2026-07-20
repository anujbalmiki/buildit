"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ResumeData, ResumeSection } from "@/types/resume"
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Info,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import BulletPointsSection from "./sections/BulletPointsSection"
import EducationSection from "./sections/EducationSection"
import ExperienceSection from "./sections/ExperienceSection"
import ParagraphSection from "./sections/ParagraphSection"
import ProjectSection from "./sections/ProjectSection"

interface SectionManagerProps {
  resumeData: ResumeData
  updateResumeData: (updates: Partial<ResumeData>) => void
  jobDescription: string
  sectionHints?: Record<number, string[]>
}

const SECTION_TYPES: { value: string; label: string }[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "bullet_points", label: "Bullet Points" },
  { value: "experience", label: "Experience" },
  { value: "project", label: "Project" },
  { value: "education", label: "Education" },
]

// Move the collapsed flags along with a section that was dragged from → to.
function remapAfterMove(set: Set<number>, from: number, to: number, len: number): Set<number> {
  const arr = Array.from({ length: len }, (_, i) => set.has(i))
  const [moved] = arr.splice(from, 1)
  arr.splice(to, 0, moved)
  const next = new Set<number>()
  arr.forEach((v, i) => v && next.add(i))
  return next
}

export default function SectionManager({
  resumeData,
  updateResumeData,
  jobDescription,
  sectionHints = {},
}: SectionManagerProps) {
  const [newSectionType, setNewSectionType] = useState<string>("")
  const [rewritingIndex, setRewritingIndex] = useState<number | null>(null)
  const [sectionErrors, setSectionErrors] = useState<Record<number, string>>({})
  const [openHints, setOpenHints] = useState<number | null>(null)

  // Set of collapsed section indices. Reset whenever the number of sections
  // changes (add / remove / load / import) so the flags never point at the
  // wrong section; reordering keeps them in sync via remapAfterMove.
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const sectionCount = resumeData.sections?.length ?? 0
  useEffect(() => {
    setCollapsed(new Set())
  }, [sectionCount])

  // Drag-to-reorder (pointer based, works on touch via the grip handle).
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null)

  const addNewSection = () => {
    if (!newSectionType) return

    const newSection: ResumeSection = {
      type: newSectionType as any,
      title: "",
      content: "",
      title_formatting: { alignment: "left", font_size: 16, font_weight: "bold" },
      content_formatting: { alignment: "left", font_size: 14, font_weight: "normal" },
    }

    if (newSectionType === "bullet_points") {
      newSection.items = [""]
    } else if (newSectionType === "experience") {
      newSection.items = [
        {
          position: "",
          company: "",
          start_month: "",
          start_year: "",
          end_type: "None" as const,
          end_month: "",
          end_year: "",
          bullet_points: [""],
        },
      ]
    } else if (newSectionType === "education") {
      newSection.items = [
        {
          degree: "",
          institution: "",
          start_month: "",
          start_year: "",
          end_type: "None" as const,
          end_month: "",
          end_year: "",
          details: "",
        },
      ]
    } else if (newSectionType === "project") {
      newSection.items = [
        {
          name: "",
          tech: "",
          github: "",
          link: "",
          start_month: "",
          start_year: "",
          end_type: "None" as const,
          end_month: "",
          end_year: "",
          bullet_points: [""],
        },
      ]
    }

    updateResumeData({ sections: [...(resumeData.sections || []), newSection] })
    setNewSectionType("")
  }

  const reorder = (from: number, to: number) => {
    const sections = [...(resumeData.sections || [])]
    const [moved] = sections.splice(from, 1)
    sections.splice(to, 0, moved)
    updateResumeData({ sections })
    setCollapsed((prev) => remapAfterMove(prev, from, to, sections.length))
  }

  const removeSection = (index: number) => {
    const sections = (resumeData.sections || []).filter((_, i) => i !== index)
    updateResumeData({ sections })
  }

  const updateSection = (index: number, updates: Partial<ResumeSection>) => {
    const sections = [...(resumeData.sections || [])]
    sections[index] = { ...sections[index], ...updates }
    updateResumeData({ sections })
  }

  const toggleCollapsed = (index: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  const allCollapsed = sectionCount > 0 && collapsed.size === sectionCount
  const toggleAll = () => {
    setCollapsed(allCollapsed ? new Set() : new Set(Array.from({ length: sectionCount }, (_, i) => i)))
  }

  // --- pointer drag handlers (attached to the grip handle) ---
  const onGripDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault()
    // Capture keeps move/up events on the handle once the finger leaves it.
    // Some browsers throw if the pointer is no longer active — non-fatal.
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    } catch {
      /* dragging still works without capture */
    }
    setDrag({ from: index, over: index })
  }

  const onGripMove = (e: React.PointerEvent) => {
    if (!drag) return
    const y = e.clientY
    const count = resumeData.sections?.length ?? 0
    let over = count
    for (let i = 0; i < count; i++) {
      const el = cardRefs.current[i]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (y < r.top + r.height / 2) {
        over = i
        break
      }
    }
    setDrag((d) => (d && d.over === over ? d : d ? { ...d, over } : d))
  }

  const onGripUp = () => {
    if (!drag) return
    const { from, over } = drag
    setDrag(null)
    let to = over
    if (from < to) to -= 1
    if (to !== from && to >= 0) reorder(from, to)
  }

  const handleRewriteSection = async (index: number) => {
    const section = resumeData.sections?.[index]
    if (!section) return

    setRewritingIndex(index)
    setSectionErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rewrite-section-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: jobDescription, section }),
      })
      if (!res.ok) throw new Error("Failed to rewrite section")
      const data = await res.json()
      updateSection(index, data)
    } catch (err: any) {
      setSectionErrors((prev) => ({ ...prev, [index]: err.message || "Unknown error" }))
    } finally {
      setRewritingIndex(null)
    }
  }

  const renderSection = (section: ResumeSection, index: number) => {
    const commonProps = {
      section,
      index,
      updateSection: (updates: Partial<ResumeSection>) => updateSection(index, updates),
    }

    switch (section.type) {
      case "paragraph":
        return <ParagraphSection key={index} {...commonProps} />
      case "bullet_points":
        return <BulletPointsSection key={index} {...commonProps} />
      case "experience":
        return <ExperienceSection key={index} {...commonProps} jobDescription={jobDescription} />
      case "education":
        return <EducationSection key={index} {...commonProps} />
      case "project":
        return <ProjectSection key={index} {...commonProps} jobDescription={jobDescription} />
      default:
        return null
    }
  }

  const sections = resumeData.sections || []
  cardRefs.current = []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Resume Sections</CardTitle>
        {sectionCount > 1 && (
          <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs text-muted-foreground">
            {allCollapsed ? "Expand all" : "Collapse all"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Section */}
        <div className="flex gap-2">
          <Select value={newSectionType} onValueChange={setNewSectionType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select section type" />
            </SelectTrigger>
            <SelectContent>
              {SECTION_TYPES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addNewSection} disabled={!newSectionType}>
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>

        {/* Existing Sections */}
        <div className="space-y-4">
          {sections.map((section, index) => {
            const isCollapsed = collapsed.has(index)
            const isDragging = drag?.from === index
            return (
              <div key={index}>
                {/* Drop indicator */}
                {drag && drag.over === index && drag.from !== index && (
                  <div className="mb-2 h-0.5 rounded bg-primary" />
                )}
                <div
                  ref={(el) => {
                    cardRefs.current[index] = el
                  }}
                  className={`rounded-lg border bg-card p-4 transition-opacity ${isDragging ? "opacity-50" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1">
                      <button
                        type="button"
                        onPointerDown={(e) => onGripDown(e, index)}
                        onPointerMove={onGripMove}
                        onPointerUp={onGripUp}
                        className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                        aria-label="Drag to reorder section"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(index)}
                        className="flex min-w-0 items-center gap-1.5 rounded p-1 hover:bg-muted"
                        aria-expanded={!isCollapsed}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <h3 className="truncate font-semibold">{section.title || `Section ${index + 1}`}</h3>
                      </button>
                      {(sectionHints[index]?.length ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={() => setOpenHints(openHints === index ? null : index)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                          title="ATS tips to improve this section"
                          aria-label="Show ATS improvement tips for this section"
                        >
                          <Info className="h-3.5 w-3.5" />
                          {sectionHints[index].length}
                        </button>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Section looks good for ATS" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isCollapsed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRewriteSection(index)}
                          disabled={rewritingIndex === index}
                        >
                          {rewritingIndex === index && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                          {rewritingIndex === index ? "Rewriting…" : "Rewrite with AI"}
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => removeSection(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {openHints === index && (sectionHints[index]?.length ?? 0) > 0 && (
                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                      <p className="mb-1 font-medium text-amber-800 dark:text-amber-300">To improve this section for ATS:</p>
                      <ul className="list-disc space-y-1 pl-5 text-amber-800 dark:text-amber-200">
                        {sectionHints[index].map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!isCollapsed && (
                    <div className="mt-4">
                      {sectionErrors[index] && <div className="mb-2 text-sm text-red-500">{sectionErrors[index]}</div>}
                      {renderSection(section, index)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {/* Drop indicator at the very end of the list */}
          {drag && drag.over === sections.length && drag.from !== sections.length - 1 && (
            <div className="h-0.5 rounded bg-primary" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
