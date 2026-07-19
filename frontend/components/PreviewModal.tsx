"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { renderResumeHtml } from "@/lib/resumeTemplates"
import type { ResumeData } from "@/types/resume"
import { ExternalLink, FileDown, Loader2 } from "lucide-react"
import { useState } from "react"

interface PreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resumeData: ResumeData
  template?: string
  onExportPdf: () => Promise<void>
  onOpenNewTab: () => void
}

const PAGE_W_MM: Record<string, number> = { A4: 210, Letter: 216, Legal: 216 }

// The HTML render works on every device (unlike an inline PDF, which mobile
// browsers refuse to display in an iframe). For the exact PDF we hand off to
// download / open-in-new-tab, which mobile handles fine.
export default function PreviewModal({
  open,
  onOpenChange,
  resumeData,
  template,
  onExportPdf,
  onOpenNewTab,
}: PreviewModalProps) {
  const [exporting, setExporting] = useState(false)

  const widthMm = PAGE_W_MM[resumeData.pdf_settings?.page_size] || PAGE_W_MM.A4
  const m = resumeData.pdf_settings?.margins
  const padding = `${m?.top || "0mm"} ${m?.right || "8mm"} ${m?.bottom || "8mm"} ${m?.left || "8mm"}`
  const zoom = resumeData.pdf_settings?.zoom ?? 1
  const html = renderResumeHtml(resumeData, template)

  const handleExport = async () => {
    setExporting(true)
    try {
      await onExportPdf()
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border p-4">
          <DialogTitle className="text-base">Resume Preview</DialogTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}
              PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onOpenNewTab}>
              <ExternalLink className="mr-1.5 h-4 w-4" /> Open
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-neutral-300 p-3 dark:bg-neutral-700 sm:p-4">
          <div
            className="mx-auto bg-white text-black shadow-md"
            style={{ width: `${widthMm}mm`, maxWidth: "100%", padding }}
          >
            <div style={{ zoom }} dangerouslySetInnerHTML={{ __html: html }} />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Approximate layout. Tap <strong>PDF</strong> to download the exact file, or <strong>Open</strong> to view it.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
