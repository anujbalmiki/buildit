"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react"
import type { ResumeData, ResumeSection } from "@/types/resume"
import ParagraphSection from "./sections/ParagraphSection"
import BulletPointsSection from "./sections/BulletPointsSection"
import ExperienceSection from "./sections/ExperienceSection"
import EducationSection from "./sections/EducationSection"

interface SectionManagerProps {
  resumeData: ResumeData
  updateResumeData: (updates: Partial<ResumeData>) => void
}

export default function SectionManager({ resumeData, updateResumeData }: SectionManagerProps) {
  const [newSectionType, setNewSectionType] = useState<string>("")

  const sectionTypes = {
    "": "Select section type",
    paragraph: "Paragraph",
    bullet_points: "Bullet Points",
    experience: "Experience",
    education: "Education",
  }

  const addNewSection = () => {
    if (!newSectionType) return

    const newSection: ResumeSection = {
      type: newSectionType as any,
      title: "",
      content: "",
      title_formatting: {
        alignment: "left",
        font_size: 16,
        font_weight: "bold",
      },
      content_formatting: {
        alignment: "left",
        font_size: 14,
        font_weight: "normal",
      },
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
    }

    const updatedSections = [...(resumeData.sections || []), newSection]
    updateResumeData({ sections: updatedSections })
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
        return <ExperienceSection key={index} {...commonProps} />
      case "education":
        return <EducationSection key={index} {...commonProps} />
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
          <select
            value={newSectionType}
            onChange={(e) => setNewSectionType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {Object.entries(sectionTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button onClick={addNewSection} disabled={!newSectionType}>
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>

        {/* Existing Sections */}
        <div className="space-y-4">
          {(resumeData.sections || []).map((section, index) => (
            <div key={index} className="border rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{section.title || `Section ${index + 1}`}</h3>
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
                </div>
              </div>
              {renderSection(section, index)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
