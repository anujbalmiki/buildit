"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchResumePdfBlobUrl } from "@/lib/resumeExport"
import { renderResumeHtml } from "@/lib/resumeTemplates"
import type { ResumeData } from "@/types/resume"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface ResumePreviewProps {
  resumeData: ResumeData
  template?: string
}

const PX_PER_MM = 96 / 25.4
const PAGE_MM: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 216, h: 279 },
  Legal: { w: 216, h: 356 },
}

function parseMm(v?: string): number {
  const n = parseFloat(v || "")
  return Number.isNaN(n) ? 0 : n
}

// Physical printable width (mm) matching the backend's @page geometry, so the
// fast preview wraps text roughly like the real PDF does.
function pageGeometry(data: ResumeData) {
  const page = PAGE_MM[data.pdf_settings?.page_size] || PAGE_MM.A4
  const m = data.pdf_settings?.margins || ({} as ResumeData["pdf_settings"]["margins"])
  return {
    widthMm: page.w,
    padding: `${m.top || "0mm"} ${m.right || "8mm"} ${m.bottom || "8mm"} ${m.left || "8mm"}`,
    zoom: data.pdf_settings?.zoom ?? 1,
  }
}

type Mode = "pdf" | "fast"

export default function ResumePreview({ resumeData, template }: ResumePreviewProps) {
  const [mode, setMode] = useState<Mode>("pdf")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const urlRef = useRef<string | null>(null)

  // Debounced exact-PDF generation — the true, WYSIWYG preview.
  useEffect(() => {
    if (mode !== "pdf") return
    setLoading(true)
    setError(false)
    const timer = setTimeout(async () => {
      try {
        const url = await fetchResumePdfBlobUrl(resumeData, template)
        if (urlRef.current) window.URL.revokeObjectURL(urlRef.current)
        urlRef.current = url
        setPdfUrl(url)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [resumeData, template, mode])

  // Release the last object URL on unmount.
  useEffect(() => () => { if (urlRef.current) window.URL.revokeObjectURL(urlRef.current) }, [])

  const geo = pageGeometry(resumeData)
  const html = renderResumeHtml(resumeData, template)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Resume Preview</CardTitle>
        <div className="flex rounded-md border border-border p-0.5 text-xs">
          <button
            onClick={() => setMode("pdf")}
            className={`rounded px-2 py-1 transition-colors ${mode === "pdf" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Exact (PDF)
          </button>
          <button
            onClick={() => setMode("fast")}
            className={`rounded px-2 py-1 transition-colors ${mode === "fast" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Fast
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "pdf" ? (
          <div className="relative min-h-[600px]">
            {error ? (
              <div className="flex min-h-[600px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <p className="text-sm text-muted-foreground">
                  Couldn&apos;t reach the PDF service to render the exact preview.
                </p>
                <button
                  onClick={() => setMode("fast")}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Show the fast preview instead
                </button>
              </div>
            ) : (
              <>
                {loading && (
                  <div className="absolute inset-x-0 top-2 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                    <Loader2 className="h-3 w-3 animate-spin" /> Rendering exact pages…
                  </div>
                )}
                {pdfUrl ? (
                  <iframe
                    title="Exact PDF preview"
                    src={`${pdfUrl}#view=FitH`}
                    className="h-[800px] w-full rounded-lg border bg-white"
                  />
                ) : (
                  <div className="flex min-h-[600px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating preview…
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="max-h-[800px] overflow-auto rounded-lg border bg-neutral-300 p-4 dark:bg-neutral-700">
            <div
              className="mx-auto bg-white text-black shadow-md"
              style={{ width: `${geo.widthMm}mm`, maxWidth: "100%", padding: geo.padding }}
            >
              <div style={{ zoom: geo.zoom }} dangerouslySetInnerHTML={{ __html: html }} />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Approximate — matches the PDF width, but switch to <strong>Exact (PDF)</strong> for true page breaks.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
