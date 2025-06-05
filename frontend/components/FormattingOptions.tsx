"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import type { ResumeData } from "@/types/resume"

interface FormattingOptionsProps {
  resumeData: ResumeData
  updateResumeData: (updates: Partial<ResumeData>) => void
}

export default function FormattingOptions({ resumeData, updateResumeData }: FormattingOptionsProps) {
  const updateFormatting = (updates: Partial<ResumeData["formatting"]>) => {
    updateResumeData({
      formatting: { ...resumeData.formatting, ...updates },
    })
  }

  const updatePDFSettings = (updates: Partial<ResumeData["pdf_settings"]>) => {
    updateResumeData({
      pdf_settings: { ...resumeData.pdf_settings, ...updates },
    })
  }

  const updateMargins = (updates: Partial<ResumeData["pdf_settings"]["margins"]>) => {
    updatePDFSettings({
      margins: { ...resumeData.pdf_settings.margins, ...updates },
    })
  }

  return (
    <div className="space-y-4">
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-gray-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Advanced Formatting Options</CardTitle>
              <ChevronDown className="h-4 w-4" />
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name Alignment</Label>
                    <Select
                      value={resumeData?.formatting?.name_alignment || "left"}
                      onValueChange={(value: "left" | "center" | "right") =>
                        updateFormatting({ name_alignment: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Section Title Alignment</Label>
                    <Select
                      value={resumeData?.formatting?.section_title_alignment || "left"}
                      onValueChange={(value: "left" | "center" | "right") =>
                        updateFormatting({ section_title_alignment: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name Font Weight</Label>
                    <Select
                      value={resumeData?.formatting?.name_weight || "normal"}
                      onValueChange={(value: "normal" | "bold" | "bolder") => updateFormatting({ name_weight: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                        <SelectItem value="bolder">Bolder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Paragraph Alignment</Label>
                    <Select
                      value={resumeData?.formatting?.paragraph_alignment || "left"}
                      onValueChange={(value: "left" | "center" | "right" | "justify") =>
                        updateFormatting({ paragraph_alignment: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                        <SelectItem value="justify">Justify</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-gray-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">PDF Export Settings</CardTitle>
              <ChevronDown className="h-4 w-4" />
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label>Page Size</Label>
                <Select
                  value={resumeData?.pdf_settings?.page_size || "A4"}
                  onValueChange={(value: "A4" | "Letter" | "Legal") => updatePDFSettings({ page_size: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="Letter">Letter</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Margins</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="top-margin">Top Margin</Label>
                    <Input
                      id="top-margin"
                      value={resumeData?.pdf_settings?.margins?.top || "20mm"}
                      onChange={(e) => updateMargins({ top: e.target.value })}
                      placeholder="e.g., 20mm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="right-margin">Right Margin</Label>
                    <Input
                      id="right-margin"
                      value={resumeData?.pdf_settings?.margins?.right || "20mm"}
                      onChange={(e) => updateMargins({ right: e.target.value })}
                      placeholder="e.g., 20mm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bottom-margin">Bottom Margin</Label>
                    <Input
                      id="bottom-margin"
                      value={resumeData?.pdf_settings?.margins?.bottom || "20mm"}
                      onChange={(e) => updateMargins({ bottom: e.target.value })}
                      placeholder="e.g., 20mm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="left-margin">Left Margin</Label>
                    <Input
                      id="left-margin"
                      value={resumeData?.pdf_settings?.margins?.left || "20mm"}
                      onChange={(e) => updateMargins({ left: e.target.value })}
                      placeholder="e.g., 20mm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Content Scale: {resumeData?.pdf_settings?.scale || 1.0}</Label>
                  <Slider
                    value={[resumeData?.pdf_settings?.scale || 1.0]}
                    onValueChange={([value]) => updatePDFSettings({ scale: value })}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zoom Level: {resumeData?.pdf_settings?.zoom || 1.0}</Label>
                  <Slider
                    value={[resumeData?.pdf_settings?.zoom || 1.0]}
                    onValueChange={([value]) => updatePDFSettings({ zoom: value })}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Line Spacing: {resumeData?.pdf_settings?.spacing || 1.0}</Label>
                <Slider
                  value={[resumeData?.pdf_settings?.spacing || 1.0]}
                  onValueChange={([value]) => updatePDFSettings({ spacing: value })}
                  min={1.0}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
