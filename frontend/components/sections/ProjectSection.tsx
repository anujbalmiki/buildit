"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProjectItem, ResumeSection } from "@/types/resume"
import { Plus, Trash2 } from "lucide-react"

interface ProjectSectionProps {
  section: ResumeSection
  index: number
  updateSection: (updates: Partial<ResumeSection>) => void
}

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const MONTHS = [
  "None", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const YEARS = ["None", ...Array.from({ length: 151 }, (_, i) => (1950 + i).toString())]

export default function ProjectSection({ section, updateSection }: ProjectSectionProps) {
  const items = (section.items || []) as ProjectItem[]

  const addProject = () => {
    updateSection({
      items: [
        ...items,
        { name: "", tech: "", github: "", link: "", start_month: "", start_year: "", end_type: "None", end_month: "", end_year: "", bullet_points: [""] },
      ],
    })
  }

  const removeProject = (i: number) => {
    if (items.length > 1) updateSection({ items: items.filter((_, idx) => idx !== i) })
  }

  const updateProject = (i: number, updates: Partial<ProjectItem>) => {
    const next = [...items]
    next[i] = { ...next[i], ...updates }
    updateSection({ items: next })
  }

  const updateBullet = (pi: number, bi: number, value: string) => {
    const next = [...items]
    next[pi].bullet_points[bi] = value
    updateSection({ items: next })
  }

  const addBullet = (pi: number) => {
    const next = [...items]
    next[pi].bullet_points.push("")
    updateSection({ items: next })
  }

  const removeBullet = (pi: number, bi: number) => {
    const next = [...items]
    if (next[pi].bullet_points.length > 1) {
      next[pi].bullet_points.splice(bi, 1)
      updateSection({ items: next })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={section.title || ""}
          onChange={(e) => updateSection({ title: e.target.value })}
          placeholder="Projects"
        />
      </div>

      {items.map((project, pi) => (
        <div key={pi} className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Project {pi + 1}</h4>
            <Button variant="destructive" size="sm" onClick={() => removeProject(pi)} disabled={items.length === 1}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={project.name || ""} onChange={(e) => updateProject(pi, { name: e.target.value })} placeholder="AI Resume Builder" />
            </div>
            <div className="space-y-2">
              <Label>Tech Stack</Label>
              <Input value={project.tech || ""} onChange={(e) => updateProject(pi, { tech: e.target.value })} placeholder="Next.js, FastAPI, MongoDB" />
            </div>
            <div className="space-y-2">
              <Label>GitHub URL</Label>
              <Input value={project.github || ""} onChange={(e) => updateProject(pi, { github: e.target.value })} placeholder="github.com/you/project" />
            </div>
            <div className="space-y-2">
              <Label>Live / Demo URL</Label>
              <Input value={project.link || ""} onChange={(e) => updateProject(pi, { link: e.target.value })} placeholder="project.vercel.app" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Start Month</Label>
              <select
                value={project.start_month || "None"}
                onChange={(e) => updateProject(pi, { start_month: e.target.value === "None" ? "" : e.target.value })}
                className={SELECT_CLASS}
              >
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Start Year</Label>
              <select
                value={project.start_year || "None"}
                onChange={(e) => updateProject(pi, { start_year: e.target.value === "None" ? "" : e.target.value })}
                className={SELECT_CLASS}
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>End Type</Label>
              <select
                value={project.end_type || "None"}
                onChange={(e) => updateProject(pi, { end_type: e.target.value as ProjectItem["end_type"] })}
                className={SELECT_CLASS}
              >
                <option value="None">None</option>
                <option value="Present">Present</option>
                <option value="Specific Month">Specific Month</option>
              </select>
            </div>
            {project.end_type === "Specific Month" && (
              <>
                <div className="space-y-2">
                  <Label>End Month</Label>
                  <select
                    value={project.end_month || "None"}
                    onChange={(e) => updateProject(pi, { end_month: e.target.value === "None" ? "" : e.target.value })}
                    className={SELECT_CLASS}
                  >
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>End Year</Label>
                  <select
                    value={project.end_year || "None"}
                    onChange={(e) => updateProject(pi, { end_year: e.target.value === "None" ? "" : e.target.value })}
                    className={SELECT_CLASS}
                  >
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Bullet Points</Label>
            {(project.bullet_points || [""]).map((bullet, bi) => (
              <div key={bi} className="flex items-center gap-2">
                <Input
                  value={bullet || ""}
                  onChange={(e) => updateBullet(pi, bi, e.target.value)}
                  placeholder={`Bullet point ${bi + 1}`}
                  className="flex-1"
                />
                <Button variant="destructive" size="sm" onClick={() => removeBullet(pi, bi)} disabled={(project.bullet_points || [""]).length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button onClick={() => addBullet(pi)} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Bullet Point
            </Button>
          </div>
        </div>
      ))}

      <Button onClick={addProject} variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        Add Project
      </Button>
    </div>
  )
}
