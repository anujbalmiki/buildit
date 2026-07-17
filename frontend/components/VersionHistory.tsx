"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { renderResumeHtml } from "@/lib/resumeTemplates"
import { getVersion, listVersions, type VersionDetail, type VersionMeta } from "@/lib/versions"
import type { ResumeData } from "@/types/resume"
import { History, Loader2, Lock, RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"

interface VersionHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string | null | undefined
  onRestore: (snapshot: ResumeData) => void
}

const SOURCE_LABEL: Record<string, string> = {
  manual: "Checkpoint",
  "pre-load": "Before import",
  auto: "Auto-saved",
  ai: "After AI edit",
}

function relativeTime(iso: string | null): string {
  if (!iso) return ""
  const then = new Date(iso).getTime()
  const secs = Math.round((Date.now() - then) / 1000)
  if (secs < 60) return "just now"
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`
  return new Date(iso).toLocaleDateString()
}

export default function VersionHistory({ open, onOpenChange, email, onRestore }: VersionHistoryProps) {
  const { toast } = useToast()
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [selected, setSelected] = useState<VersionDetail | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (!open || !email) return
    setSelected(null)
    setLoadingList(true)
    listVersions(email)
      .then(setVersions)
      .catch(() => toast({ title: "Error", description: "Could not load version history.", variant: "destructive" }))
      .finally(() => setLoadingList(false))
  }, [open, email, toast])

  const selectVersion = async (id: string) => {
    if (!email) return
    setLoadingPreview(true)
    try {
      setSelected(await getVersion(email, id))
    } catch {
      toast({ title: "Error", description: "Could not load that version.", variant: "destructive" })
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleRestore = () => {
    if (!selected) return
    onRestore(selected.snapshot)
    onOpenChange(false)
    toast({ title: "Restored", description: "This version is now your current resume. The previous one was saved to history." })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Version history
          </DialogTitle>
          <DialogDescription>
            Restore an earlier version. Your current resume is always saved to history first, so restoring is safe.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[240px_1fr]">
          {/* Version list */}
          <div className="max-h-[60vh] overflow-auto rounded-md border border-border">
            {loadingList ? (
              <div className="flex items-center justify-center p-6 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : versions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No saved versions yet. Versions are created when you save a checkpoint, import a resume, or after periodic autosaves.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {versions.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => selectVersion(v.id)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                        selected?.id === v.id ? "bg-accent" : ""
                      }`}
                    >
                      <span>
                        <span className="font-medium">{SOURCE_LABEL[v.source] || v.source}</span>
                        <span className="block text-xs text-muted-foreground">{relativeTime(v.created_at)}</span>
                      </span>
                      {v.protected && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Preview */}
          <div className="flex min-h-[300px] flex-col rounded-md border border-border">
            {loadingPreview ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading preview…
              </div>
            ) : selected ? (
              <>
                <div
                  className="max-h-[52vh] flex-1 overflow-auto bg-white p-4 text-black"
                  dangerouslySetInnerHTML={{
                    __html: renderResumeHtml(selected.snapshot, selected.snapshot.template),
                  }}
                />
                <div className="flex justify-end border-t border-border p-2">
                  <Button size="sm" onClick={handleRestore}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Restore this version
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
                Select a version to preview it here.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
