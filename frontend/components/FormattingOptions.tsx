"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import type { ResumeData } from "@/types/resume"
import { ChevronDown } from "lucide-react"

interface FormattingOptionsProps {
  resumeData: ResumeData
  updateResumeData: (updates: Partial<ResumeData>) => void
}

type Margins = ResumeData["pdf_settings"]["margins"]

// Top stays small on every preset so the name/header sits near the top of page
// one; continuation pages get their own top margin automatically (backend).
const MARGIN_PRESETS: Record<string, Margins> = {
  Compact: { top: "0mm", right: "6mm", bottom: "6mm", left: "6mm" },
  Normal: { top: "0mm", right: "8mm", bottom: "8mm", left: "8mm" },
  Wide: { top: "0mm", right: "14mm", bottom: "12mm", left: "14mm" },
}

const DENSITY_PRESETS: Record<string, { zoom: number; spacing: number }> = {
  Compact: { zoom: 1.0, spacing: 1.15 },
  Normal: { zoom: 1.15, spacing: 1.3 },
  Relaxed: { zoom: 1.25, spacing: 1.5 },
}

function marginPresetName(m?: Margins): string {
  for (const [name, p] of Object.entries(MARGIN_PRESETS)) {
    if (p.right === m?.right && p.bottom === m?.bottom && p.left === m?.left) return name
  }
  return "Custom"
}

function densityPresetName(s?: ResumeData["pdf_settings"]): string {
  for (const [name, p] of Object.entries(DENSITY_PRESETS)) {
    if (p.zoom === s?.zoom && p.spacing === s?.spacing) return name
  }
  return "Custom"
}

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded px-3 py-1 text-sm transition-colors ${
            value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export default function FormattingOptions({ resumeData, updateResumeData }: FormattingOptionsProps) {
  const pdf = resumeData.pdf_settings

  const updatePDFSettings = (updates: Partial<ResumeData["pdf_settings"]>) => {
    updateResumeData({ pdf_settings: { ...pdf, ...updates } })
  }

  const updateMargins = (updates: Partial<Margins>) => {
    updatePDFSettings({ margins: { ...pdf.margins, ...updates } })
  }

  const marginName = marginPresetName(pdf?.margins)
  const densityName = densityPresetName(pdf)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Page setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Page size</Label>
          <Select
            value={pdf?.page_size || "A4"}
            onValueChange={(value: "A4" | "Letter" | "Legal") => updatePDFSettings({ page_size: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4 (most of the world)</SelectItem>
              <SelectItem value="Letter">Letter (US &amp; Canada)</SelectItem>
              <SelectItem value="Legal">Legal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Margins</Label>
          <Segmented
            options={["Compact", "Normal", "Wide"]}
            value={marginName}
            onChange={(name) => updatePDFSettings({ margins: { ...MARGIN_PRESETS[name] } })}
          />
        </div>

        <div className="space-y-2">
          <Label>Density</Label>
          <Segmented
            options={["Compact", "Normal", "Relaxed"]}
            value={densityName}
            onChange={(name) => updatePDFSettings({ ...DENSITY_PRESETS[name] })}
          />
          <p className="text-xs text-muted-foreground">Controls text size and line spacing — fit more, or give it room.</p>
        </div>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Advanced
              <ChevronDown className="h-4 w-4" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label>Exact margins</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="top-margin" className="text-xs text-muted-foreground">First-page top</Label>
                  <Input id="top-margin" value={pdf?.margins?.top || "0mm"} onChange={(e) => updateMargins({ top: e.target.value })} placeholder="e.g. 0mm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="right-margin" className="text-xs text-muted-foreground">Right</Label>
                  <Input id="right-margin" value={pdf?.margins?.right || "8mm"} onChange={(e) => updateMargins({ right: e.target.value })} placeholder="e.g. 8mm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bottom-margin" className="text-xs text-muted-foreground">Bottom</Label>
                  <Input id="bottom-margin" value={pdf?.margins?.bottom || "8mm"} onChange={(e) => updateMargins({ bottom: e.target.value })} placeholder="e.g. 8mm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="left-margin" className="text-xs text-muted-foreground">Left</Label>
                  <Input id="left-margin" value={pdf?.margins?.left || "8mm"} onChange={(e) => updateMargins({ left: e.target.value })} placeholder="e.g. 8mm" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Text size (zoom): {pdf?.zoom ?? 1.0}</Label>
              <Slider value={[pdf?.zoom ?? 1.0]} onValueChange={([value]) => updatePDFSettings({ zoom: value })} min={0.8} max={1.4} step={0.05} />
            </div>
            <div className="space-y-2">
              <Label>Line spacing: {pdf?.spacing ?? 1.3}</Label>
              <Slider value={[pdf?.spacing ?? 1.3]} onValueChange={([value]) => updatePDFSettings({ spacing: value })} min={1.0} max={2.0} step={0.05} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
