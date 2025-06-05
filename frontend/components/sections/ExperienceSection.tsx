"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ExperienceItem, ResumeSection } from "@/types/resume"
import { Plus, Trash2 } from "lucide-react"

interface ExperienceSectionProps {
  section: ResumeSection
  index: number
  updateSection: (updates: Partial<ResumeSection>) => void
}

export default function ExperienceSection({ section, updateSection }: ExperienceSectionProps) {
  const items = (section.items || []) as ExperienceItem[]

  const months = [
    "None",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const years = ["None", ...Array.from({ length: 151 }, (_, i) => (1950 + i).toString())]

  const addExperience = () => {
    const newItems = [
      ...items,
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
    updateSection({ items: newItems })
  }

  const removeExperience = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index)
      updateSection({ items: newItems })
    }
  }

  const updateExperience = (index: number, updates: Partial<ExperienceItem>) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    updateSection({ items: newItems })
  }

  const addBulletPoint = (expIndex: number) => {
    const newItems = [...items]
    newItems[expIndex].bullet_points.push("")
    updateSection({ items: newItems })
  }

  const removeBulletPoint = (expIndex: number, bulletIndex: number) => {
    const newItems = [...items]
    if (newItems[expIndex].bullet_points.length > 1) {
      newItems[expIndex].bullet_points.splice(bulletIndex, 1)
      updateSection({ items: newItems })
    }
  }

  const updateBulletPoint = (expIndex: number, bulletIndex: number, value: string) => {
    const newItems = [...items]
    newItems[expIndex].bullet_points[bulletIndex] = value
    updateSection({ items: newItems })
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

      {items.map((experience, expIndex) => (
        <div key={expIndex} className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Experience {expIndex + 1}</h4>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeExperience(expIndex)}
              disabled={items.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                value={experience.position || ""}
                onChange={(e) => updateExperience(expIndex, { position: e.target.value })}
                placeholder="Job title"
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={experience.company || ""}
                onChange={(e) => updateExperience(expIndex, { company: e.target.value })}
                placeholder="Company name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Start Month</Label>
              <select
                value={experience.start_month || "None"}
                onChange={(e) =>
                  updateExperience(expIndex, {
                    start_month: e.target.value === "None" ? "" : e.target.value,
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Start Year</Label>
              <select
                value={experience.start_year || "None"}
                onChange={(e) =>
                  updateExperience(expIndex, {
                    start_year: e.target.value === "None" ? "" : e.target.value,
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>End Type</Label>
              <select
                value={experience.end_type || "None"}
                onChange={(e) =>
                  updateExperience(expIndex, { end_type: e.target.value as "None" | "Present" | "Specific Month" })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="None">None</option>
                <option value="Present">Present</option>
                <option value="Specific Month">Specific Month</option>
              </select>
            </div>
            {experience.end_type === "Specific Month" && (
              <>
                <div className="space-y-2">
                  <Label>End Month</Label>
                  <select
                    value={experience.end_month || "None"}
                    onChange={(e) =>
                      updateExperience(expIndex, {
                        end_month: e.target.value === "None" ? "" : e.target.value,
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>End Year</Label>
                  <select
                    value={experience.end_year || "None"}
                    onChange={(e) =>
                      updateExperience(expIndex, {
                        end_year: e.target.value === "None" ? "" : e.target.value,
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Bullet Points</Label>
            {(experience.bullet_points || [""]).map((bullet, bulletIndex) => (
              <div key={bulletIndex} className="flex gap-2 items-center">
                <Input
                  value={bullet || ""}
                  onChange={(e) => updateBulletPoint(expIndex, bulletIndex, e.target.value)}
                  placeholder={`Bullet point ${bulletIndex + 1}`}
                  className="flex-1"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeBulletPoint(expIndex, bulletIndex)}
                  disabled={(experience.bullet_points || [""]).length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button onClick={() => addBulletPoint(expIndex)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Bullet Point
            </Button>
          </div>
        </div>
      ))}

      <Button onClick={addExperience} variant="outline">
        <Plus className="w-4 h-4 mr-2" />
        Add Experience
      </Button>
    </div>
  )
}
