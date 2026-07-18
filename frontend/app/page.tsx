"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import AiTools from "@/components/AiTools"
import AtsScore from "@/components/AtsScore"
import AuthButton from "@/components/AuthButton"
import ThemeToggle from "@/components/ThemeToggle"
import BasicInfoForm from "@/components/BasicInfoForm"
import SectionManager from "@/components/SectionManager"
import ResumePreview from "@/components/ResumePreview"
import FileUpload from "@/components/FileUpload"
import LoadResume from "@/components/LoadResume"
import SaveGenerate from "@/components/SaveGenerate"
import FormattingOptions from "@/components/FormattingOptions"
import TemplateSelector from "@/components/TemplateSelector"
import FloatingToolbar from "@/components/FloatingToolbar"
import VersionHistory from "@/components/VersionHistory"
import ImportJson from "@/components/ImportJson"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { computeAtsScore } from "@/lib/ats"
import { DEFAULT_TEMPLATE } from "@/lib/resumeTemplates"
import { downloadResumePdf, fetchResumePdfBlobUrl } from "@/lib/resumeExport"
import { createVersion } from "@/lib/versions"
import { type ResumeData, defaultResumeData } from "@/types/resume"

type SaveStatus = "idle" | "saving" | "saved" | "error"

// Undo/redo: keep the last N states in memory, and collapse a rapid burst of
// edits (e.g. typing) into a single undo step.
const HISTORY_LIMIT = 50
const HISTORY_COALESCE_MS = 500
// Durable version history: at most one automatic snapshot per this interval.
const AUTO_VERSION_INTERVAL_MS = 10 * 60 * 1000

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

// Is this resume meaningfully filled in? Used to decide whether replacing it
// (import / restore) is worth snapshotting first.
function hasContent(data: ResumeData): boolean {
  return (
    (data.sections?.length ?? 0) > 0 ||
    (!!data.name && data.name !== defaultResumeData.name) ||
    !!data.contact_info
  )
}

export default function ResumeBuilder() {
  const { data: session } = useSession()
  const email = session?.user?.email
  const { toast } = useToast()

  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData)
  const [jobDescription, setJobDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [historyOpen, setHistoryOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  // In-memory undo/redo stacks.
  const [past, setPast] = useState<ResumeData[]>([])
  const [future, setFuture] = useState<ResumeData[]>([])

  const editedRef = useRef(false)
  const lastEditAt = useRef(0)
  const lastAutoVersionAt = useRef(0)
  const autoLoadedFor = useRef<string | null>(null)

  const template = resumeData.template ?? DEFAULT_TEMPLATE

  // Wake up backend on mount (free-tier cold start)
  useEffect(() => {
    fetch(`${BACKEND}/wake`, { method: "GET" }).catch(() => {})
  }, [])

  // An actual edit: record history (coalescing rapid bursts) and flag dirty.
  const updateResumeData = (updates: Partial<ResumeData>) => {
    editedRef.current = true
    const now = Date.now()
    const previous = resumeData
    setPast((p) => {
      if (now - lastEditAt.current < HISTORY_COALESCE_MS && p.length > 0) return p
      return [...p, previous].slice(-HISTORY_LIMIT)
    })
    setFuture([])
    lastEditAt.current = now
    setResumeData((prev) => ({ ...prev, ...updates }))
  }

  // Replacing the whole resume (account load / upload / restore). Snapshots the
  // current resume to history first (if it has content) so nothing is lost, and
  // resets undo/redo since crossing a full-document swap would be confusing.
  const loadResumeData = (data: ResumeData) => {
    if (email && hasContent(resumeData)) {
      createVersion(email, resumeData, "pre-load", true)
    }
    editedRef.current = false
    lastEditAt.current = 0
    setPast([])
    setFuture([])
    setResumeData(data)
  }

  // Auto-load the user's saved resume once, right after they sign in — there's
  // only one resume per account. Skip if they already have unsaved edits in
  // progress (so we never clobber local work) or if nothing is saved yet.
  useEffect(() => {
    if (!email || autoLoadedFor.current === email || editedRef.current) return
    autoLoadedFor.current = email
    ;(async () => {
      try {
        const res = await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}`)
        if (res.ok) loadResumeData(await res.json())
      } catch {
        /* leave the current resume as-is on failure */
      }
    })()
    // loadResumeData reads the latest state via closure; only re-run per email.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p
      const previous = p[p.length - 1]
      setFuture((f) => [resumeData, ...f].slice(0, HISTORY_LIMIT))
      setResumeData(previous)
      editedRef.current = true
      lastEditAt.current = 0
      return p.slice(0, -1)
    })
  }, [resumeData])

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f
      const next = f[0]
      setPast((p) => [...p, resumeData].slice(-HISTORY_LIMIT))
      setResumeData(next)
      editedRef.current = true
      lastEditAt.current = 0
      return f.slice(1)
    })
  }, [resumeData])

  // Keyboard shortcuts — but don't hijack native text undo while editing a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return
      const key = e.key.toLowerCase()
      if (key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo])

  // Debounced autosave — only when signed in and the user has actually edited.
  // Fires 1.5s after the last edit, and drops a throttled durable snapshot.
  useEffect(() => {
    if (!email || !editedRef.current) return
    const timer = setTimeout(async () => {
      setSaveStatus("saving")
      try {
        const res = await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resumeData),
        })
        if (res.ok) {
          editedRef.current = false
          setSaveStatus("saved")
          const now = Date.now()
          if (now - lastAutoVersionAt.current > AUTO_VERSION_INTERVAL_MS) {
            lastAutoVersionAt.current = now
            createVersion(email, resumeData, "auto", false)
          }
        } else {
          setSaveStatus("error")
        }
      } catch {
        setSaveStatus("error")
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [resumeData, email])

  // Manual "Save" from the toolbar = save now + a protected checkpoint.
  const handleManualSave = useCallback(async () => {
    if (!email) {
      toast({ title: "Sign in to save", description: "Checkpoints are saved to your account." })
      return
    }
    setSaveStatus("saving")
    try {
      const res = await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeData),
      })
      if (!res.ok) throw new Error("save failed")
      await createVersion(email, resumeData, "manual", true)
      lastAutoVersionAt.current = Date.now()
      editedRef.current = false
      setSaveStatus("saved")
      toast({ title: "Checkpoint saved", description: "You can restore this version anytime from history." })
    } catch {
      setSaveStatus("error")
      toast({ title: "Error", description: "Could not save. Please try again.", variant: "destructive" })
    }
  }, [email, resumeData, toast])

  const handleExportPdf = useCallback(async () => {
    try {
      await downloadResumePdf(resumeData, template)
      toast({ title: "Success", description: "PDF generated and downloaded." })
    } catch {
      toast({ title: "Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" })
    }
  }, [resumeData, template, toast])

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(resumeData, null, 2))
      toast({ title: "Copied", description: "Resume JSON copied. Paste it into another tool, then re-import it here." })
    } catch {
      toast({ title: "Error", description: "Could not copy to clipboard.", variant: "destructive" })
    }
  }, [resumeData, toast])

  // Open the *real* generated PDF in a new tab. Open the window synchronously
  // (inside the click) so it isn't blocked as a popup, then fill it once ready.
  const handleOpenNewTab = useCallback(async () => {
    const win = window.open("", "_blank")
    if (!win) {
      toast({ title: "Popup blocked", description: "Allow popups for this site to open the PDF in a new tab." })
      return
    }
    win.document.write("<p style='font-family:sans-serif;padding:24px'>Generating PDF preview…</p>")
    try {
      const url = await fetchResumePdfBlobUrl(resumeData, template)
      win.location.href = url
    } catch {
      win.close()
      toast({ title: "Error", description: "Could not generate the PDF preview.", variant: "destructive" })
    }
  }, [resumeData, template, toast])

  // Not memoized on purpose: it must call the current-render loadResumeData so
  // the "snapshot current resume first" step captures the latest in-memory state.
  const handleRestore = async (snapshot: ResumeData) => {
    loadResumeData(snapshot) // snapshots the current resume to history first
    if (email) {
      try {
        await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        })
        setSaveStatus("saved")
      } catch {
        setSaveStatus("error")
      }
    }
  }

  const atsResult = useMemo(() => computeAtsScore(resumeData, jobDescription), [resumeData, jobDescription])

  const saveLabel = !email
    ? ""
    : saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "All changes saved"
        : saveStatus === "error"
          ? "Save failed — will retry on next edit"
          : ""

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-end gap-3">
            {saveLabel && <span className="text-xs text-muted-foreground">{saveLabel}</span>}
            <ThemeToggle />
            <AuthButton />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">Buildit - AI Resume Builder</h1>
            <p className="text-lg text-muted-foreground">Create an ATS-friendly resume with your preferred formatting</p>
          </div>
        </div>

        <div className="mb-8">
          <AtsScore result={atsResult} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Editor (tabbed) */}
          <div>
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="ai">AI Tools</TabsTrigger>
                <TabsTrigger value="format">Format &amp; Export</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-6">
                <LoadResume onResumeLoaded={loadResumeData} setIsLoading={setIsLoading} />
                <FileUpload onResumeLoaded={loadResumeData} setIsLoading={setIsLoading} />
                <BasicInfoForm resumeData={resumeData} updateResumeData={updateResumeData} />
                <SectionManager
                  resumeData={resumeData}
                  updateResumeData={updateResumeData}
                  jobDescription={jobDescription}
                  sectionHints={atsResult.sectionHints}
                />
              </TabsContent>

              <TabsContent value="ai" className="space-y-6">
                <AiTools
                  resumeData={resumeData}
                  updateResumeData={updateResumeData}
                  jobDescription={jobDescription}
                  setJobDescription={setJobDescription}
                />
              </TabsContent>

              <TabsContent value="format" className="space-y-6">
                <TemplateSelector template={template} setTemplate={(id) => updateResumeData({ template: id })} />
                <FormattingOptions resumeData={resumeData} updateResumeData={updateResumeData} />
                <SaveGenerate
                  resumeData={resumeData}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  template={template}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <ResumePreview resumeData={resumeData} template={template} />
          </div>
        </div>
      </div>

      <FloatingToolbar
        isSignedIn={!!email}
        isSaving={saveStatus === "saving"}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onSave={handleManualSave}
        onExportPdf={handleExportPdf}
        onCopyJson={handleCopyJson}
        onImportJson={() => setImportOpen(true)}
        onOpenNewTab={handleOpenNewTab}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <VersionHistory open={historyOpen} onOpenChange={setHistoryOpen} email={email} onRestore={handleRestore} />
      <ImportJson open={importOpen} onOpenChange={setImportOpen} onImport={loadResumeData} />
    </div>
  )
}
