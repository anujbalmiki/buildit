"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Trash2, Plus } from "lucide-react"
import type { ResumeSection, EducationItem } from "@/types/resume"

interface EducationSectionProps {
  section: ResumeSection
  index: number
  updateSection: (updates: Partial<ResumeSection>) => void
}

export default function EducationSection({ section, updateSection }: EducationSectionProps) {
  const items = (section.items || []) as EducationItem[]

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

  const addEducation = () => {
    const newItems = [
      ...items,
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
    updateSection({ items: newItems })
  }

  const removeEducation = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index)
      updateSection({ items: newItems })
    }
  }

  const updateEducation = (index: number, updates: Partial<EducationItem>) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
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

      {items.map((education, eduIndex) => (
        <div key={eduIndex} className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Education {eduIndex + 1}</h4>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeEducation(eduIndex)}
              disabled={items.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Degree</Label>
              <Input
                value={education.degree || ""}
                onChange={(e) => updateEducation(eduIndex, { degree: e.target.value })}
                placeholder="Degree/Certificate"
              />
            </div>
            <div className="space-y-2">
              <Label>Institution</Label>
              <Input
                value={education.institution || ""}
                onChange={(e) => updateEducation(eduIndex, { institution: e.target.value })}
                placeholder="School/University"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Start Month</Label>
              <select
                value={education.start_month || "None"}
                onChange={(e) =>
                  updateEducation(eduIndex, {
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
                value={education.start_year || "None"}
                onChange={(e) =>
                  updateEducation(eduIndex, {
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
                value={education.end_type || "None"}
                onChange={(e) =>
                  updateEducation(eduIndex, { end_type: e.target.value as "None" | "Present" | "Specific Month" })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="None">None</option>
                <option value="Present">Present</option>
                <option value="Specific Month">Specific Month</option>
              </select>
            </div>
            {education.end_type === "Specific Month" && (
              <>
                <div className="space-y-2">
                  <Label>End Month</Label>
                  <select
                    value={education.end_month || "None"}
                    onChange={(e) =>
                      updateEducation(eduIndex, {
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
                    value={education.end_year || "None"}
                    onChange={(e) =>
                      updateEducation(eduIndex, {
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
            <Label>Details</Label>
            <Input
              value={education.details || ""}
              onChange={(e) => updateEducation(eduIndex, { details: e.target.value })}
              placeholder="Additional details (GPA, honors, etc.)"
            />
          </div>
        </div>
      ))}

      <Button onClick={addEducation} variant="outline">
        <Plus className="w-4 h-4 mr-2" />
        Add Education
      </Button>
    </div>
  )
}
