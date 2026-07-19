"use client"

import { Button } from "@/components/ui/button"
import {
  ArrowUp,
  ClipboardCopy,
  ClipboardPaste,
  Eye,
  ExternalLink,
  FileDown,
  History,
  Loader2,
  Redo2,
  Save,
  Share2,
  Undo2,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

interface FloatingToolbarProps {
  isSignedIn: boolean
  isSaving: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onExportPdf: () => Promise<void>
  onCopyJson: () => void
  onImportJson: () => void
  onOpenNewTab: () => void
  onOpenHistory: () => void
  onOpenShare: () => void
  onOpenPreview: () => void
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <div className="group relative flex items-center">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {children}
      </Button>
      {/* Hover note, shown to the left since the bar sits at the right edge. */}
      <span className="pointer-events-none absolute right-full top-1/2 z-50 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </div>
  )
}

export default function FloatingToolbar({
  isSignedIn,
  isSaving,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onExportPdf,
  onCopyJson,
  onImportJson,
  onOpenNewTab,
  onOpenHistory,
  onOpenShare,
  onOpenPreview,
}: FloatingToolbarProps) {
  const [exporting, setExporting] = useState(false)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      await onExportPdf()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-center gap-1 rounded-full border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <ToolButton label="Preview resume" onClick={onOpenPreview}>
        <Eye className="h-4 w-4" />
      </ToolButton>

      <div className="my-1 h-px w-6 bg-border" />

      <ToolButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
        <Undo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Redo (Ctrl+Y)" onClick={onRedo} disabled={!canRedo}>
        <Redo2 className="h-4 w-4" />
      </ToolButton>

      <div className="my-1 h-px w-6 bg-border" />

      <ToolButton
        label={isSignedIn ? "Save a checkpoint" : "Sign in to save checkpoints"}
        onClick={onSave}
        disabled={!isSignedIn || isSaving}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      </ToolButton>
      <ToolButton label="Export to PDF" onClick={handleExport} disabled={exporting}>
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      </ToolButton>
      <ToolButton label="Copy JSON (to edit elsewhere)" onClick={onCopyJson}>
        <ClipboardCopy className="h-4 w-4" />
      </ToolButton>
      <ToolButton label="Import JSON" onClick={onImportJson}>
        <ClipboardPaste className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label={isSignedIn ? "Version history" : "Sign in to use version history"}
        onClick={onOpenHistory}
        disabled={!isSignedIn}
      >
        <History className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label={isSignedIn ? "Share a public link" : "Sign in to share a link"}
        onClick={onOpenShare}
        disabled={!isSignedIn}
      >
        <Share2 className="h-4 w-4" />
      </ToolButton>

      <div className="my-1 h-px w-6 bg-border" />

      <ToolButton label="Open the PDF in a new tab" onClick={onOpenNewTab}>
        <ExternalLink className="h-4 w-4" />
      </ToolButton>
      {showTop && (
        <ToolButton label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ArrowUp className="h-4 w-4" />
        </ToolButton>
      )}
    </div>
  )
}
