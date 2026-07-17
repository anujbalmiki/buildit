"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TEMPLATES } from "@/lib/resumeTemplates"
import { Check } from "lucide-react"

interface TemplateSelectorProps {
  template: string
  setTemplate: (id: string) => void
}

export default function TemplateSelector({ template, setTemplate }: TemplateSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Template</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => {
            const active = t.id === template
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={`relative rounded-lg border p-3 text-left transition-colors ${
                  active ? "border-primary bg-accent ring-1 ring-primary" : "border-border hover:bg-accent"
                }`}
              >
                {active && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                <div className="font-semibold">{t.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.blurb}</div>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          All templates are single-column and ATS-safe — your content maps into the selected layout automatically.
        </p>
      </CardContent>
    </Card>
  )
}
