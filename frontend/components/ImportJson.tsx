"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { defaultResumeData, type ResumeData } from "@/types/resume"
import { useState } from "react"

interface ImportJsonProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: ResumeData) => void
}

export default function ImportJson({ open, onOpenChange, onImport }: ImportJsonProps) {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleImport = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setError("That isn't valid JSON. Paste the full resume JSON (starting with { and ending with }).")
      return
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setError("Expected a JSON object describing a resume.")
      return
    }
    const obj = parsed as Partial<ResumeData>
    if (!Array.isArray(obj.sections)) {
      setError('This JSON has no "sections" array — it doesn\'t look like a Buildit resume.')
      return
    }
    // Fill in any missing top-level fields so a partial edit from an external
    // tool can't break the editor.
    const data: ResumeData = {
      ...defaultResumeData,
      ...obj,
      formatting: { ...defaultResumeData.formatting, ...(obj.formatting || {}) },
      pdf_settings: { ...defaultResumeData.pdf_settings, ...(obj.pdf_settings || {}) },
    }
    onImport(data)
    setText("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import resume JSON</DialogTitle>
          <DialogDescription>
            Paste resume JSON here — for example after copying it out, having another AI rewrite it, and bringing it
            back. Your current resume is saved to history first, so importing is safe to undo.
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          placeholder='{ "name": "...", "title": "...", "sections": [ ... ] }'
          spellCheck={false}
          className="h-64 w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!text.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
