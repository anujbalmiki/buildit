"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { ResumeSection } from "@/types/resume"

interface ParagraphSectionProps {
  section: ResumeSection
  index: number
  updateSection: (updates: Partial<ResumeSection>) => void
}

export default function ParagraphSection({ section, updateSection }: ParagraphSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={section.title || ""}
          onChange={(e) => updateSection({ title: e.target.value })}
          placeholder="Enter section title"
        />
      </div>
      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea
          value={section.content || ""}
          onChange={(e) => updateSection({ content: e.target.value })}
          placeholder="Enter section content"
          rows={4}
        />
      </div>
    </div>
  )
}
