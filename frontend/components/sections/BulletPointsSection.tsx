"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react"
import type { ResumeSection } from "@/types/resume"

interface BulletPointsSectionProps {
  section: ResumeSection
  index: number
  updateSection: (updates: Partial<ResumeSection>) => void
}

export default function BulletPointsSection({ section, updateSection }: BulletPointsSectionProps) {
  const items = section.items || [""]

  const addBulletPoint = () => {
    const newItems = [...items, ""]
    updateSection({ items: newItems })
  }

  const removeBulletPoint = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index)
      updateSection({ items: newItems })
    }
  }

  const updateBulletPoint = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    updateSection({ items: newItems })
  }

  const moveBulletPoint = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex >= 0 && newIndex < items.length) {
      const newItems = [...items]
      ;[newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]]
      updateSection({ items: newItems })
    }
  }

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
        <Label>Bullet Points</Label>
        {items.map((item, index) => (
          <div key={index} className="flex gap-2 items-center">
            <div className="flex flex-col gap-1">
              <Button variant="outline" size="sm" onClick={() => moveBulletPoint(index, "up")} disabled={index === 0}>
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveBulletPoint(index, "down")}
                disabled={index === items.length - 1}
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>
            <Input
              value={item || ""}
              onChange={(e) => updateBulletPoint(index, e.target.value)}
              placeholder={`Bullet point ${index + 1}`}
              className="flex-1"
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeBulletPoint(index)}
              disabled={items.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button onClick={addBulletPoint} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Bullet Point
        </Button>
      </div>
    </div>
  )
}
