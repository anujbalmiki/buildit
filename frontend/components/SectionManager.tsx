"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ResumeData, ResumeSection } from "@/types/resume"
import { CheckCircle2, ChevronDown, ChevronUp, Info, Loader2, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
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

  const moveSection = (index: number, direction: "up" | "down") => {
    const sections = [...(resumeData.sections || [])]
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex >= 0 && newIndex < sections.length) {
      ;[sections[index], sections[newIndex]] = [sections[newIndex], sections[index]]
      updateResumeData({ sections })
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume Sections</CardTitle>
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
          {(resumeData.sections || []).map((section, index) => (
            <div key={index} className="border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{section.title || `Section ${index + 1}`}</h3>
                  {(sectionHints[index]?.length ?? 0) > 0 ? (
                    <button
                      type="button"
                      onClick={() => setOpenHints(openHints === index ? null : index)}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                      title="ATS tips to improve this section"
                      aria-label="Show ATS improvement tips for this section"
                    >
                      <Info className="h-3.5 w-3.5" />
                      {sectionHints[index].length}
                    </button>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Section looks good for ATS" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => moveSection(index, "up")} disabled={index === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveSection(index, "down")}
                    disabled={index === (resumeData.sections || []).length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => removeSection(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRewriteSection(index)}
                    disabled={rewritingIndex === index}
                  >
                    {rewritingIndex === index && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                    {rewritingIndex === index ? "Rewriting…" : "Rewrite with AI"}
                  </Button>
                </div>
              </div>
              {openHints === index && (sectionHints[index]?.length ?? 0) > 0 && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="mb-1 font-medium text-amber-800 dark:text-amber-300">To improve this section for ATS:</p>
                  <ul className="list-disc space-y-1 pl-5 text-amber-800 dark:text-amber-200">
                    {sectionHints[index].map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sectionErrors[index] && <div className="text-red-500 text-sm mb-2">{sectionErrors[index]}</div>}
              {renderSection(section, index)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
