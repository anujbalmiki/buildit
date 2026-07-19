"use client"

import { Button } from "@/components/ui/button"
import { downloadResumeDocx, fetchResumePdfBlobUrl } from "@/lib/resumeExport"
import { DEFAULT_TEMPLATE } from "@/lib/resumeTemplates"
import { getPublicResume } from "@/lib/share"
import type { ResumeData } from "@/types/resume"
import { AlertTriangle, FileDown, FileText, Loader2 } from "lucide-react"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

type Status = "loading" | "ready" | "notfound" | "error"

export default function PublicResumePage() {
  const params = useParams<{ token: string }>()
  const token = params?.token

  const [status, setStatus] = useState<Status>("loading")
  const [resume, setResume] = useState<ResumeData | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [docxLoading, setDocxLoading] = useState(false)
  const urlRef = useRef<string | null>(null)

  // Fetch the shared resume, then render it to a real PDF for the viewer.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await getPublicResume(token)
        if (cancelled) return
        if (!data) {
          setStatus("notfound")
          return
        }
        setResume(data)
        const url = await fetchResumePdfBlobUrl(data, data.template ?? DEFAULT_TEMPLATE)
        if (cancelled) {
          window.URL.revokeObjectURL(url)
          return
        }
        urlRef.current = url
        setPdfUrl(url)
        setStatus("ready")
      } catch {
        if (!cancelled) setStatus("error")
      }
    })()
    return () => {
      cancelled = true
      if (urlRef.current) window.URL.revokeObjectURL(urlRef.current)
    }
  }, [token])

  const handleDownloadPdf = () => {
    if (!pdfUrl || !resume) return
    const a = document.createElement("a")
    a.href = pdfUrl
    a.download = `${(resume.name || "resume").replace(/\s+/g, "_")}_Resume.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDownloadDocx = async () => {
    if (!resume) return
    setDocxLoading(true)
    try {
      await downloadResumeDocx(resume)
    } finally {
      setDocxLoading(false)
    }
  }

  if (status === "notfound") {
    return (
      <Centered>
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <h1 className="text-xl font-semibold">This link isn&apos;t available</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The shared resume was turned off or the link has changed. Ask the owner for an updated link.
        </p>
      </Centered>
    )
  }

  if (status === "error") {
    return (
      <Centered>
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Couldn&apos;t load this resume. Please try again later.</p>
      </Centered>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {resume?.name && resume.name !== "Full Name" ? resume.name : "Resume"}
            </p>
            {resume?.title && resume.title !== "Professional Title" && (
              <p className="truncate text-xs text-muted-foreground">{resume.title}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={!pdfUrl}>
              <FileDown className="mr-1.5 h-4 w-4" /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadDocx} disabled={docxLoading || !resume}>
              {docxLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileText className="mr-1.5 h-4 w-4" />}
              Word
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {status === "loading" || !pdfUrl ? (
          <div className="flex min-h-[70vh] items-center justify-center rounded-lg border bg-background text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading resume…
          </div>
        ) : (
          <iframe title="Shared resume" src={`${pdfUrl}#view=FitH`} className="h-[85vh] w-full rounded-lg border bg-white" />
        )}
      </main>

      <footer className="pb-8 text-center text-xs text-muted-foreground">
        <a href="/" className="underline-offset-4 hover:underline">
          Made with Buildit
        </a>
      </footer>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/40 px-4 text-center">
      {children}
    </div>
  )
}
