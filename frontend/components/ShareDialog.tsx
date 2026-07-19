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
import {
  disableShare,
  enableShare,
  getShareState,
  regenerateShare,
  shareUrl,
  type ShareState,
} from "@/lib/share"
import { Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"

// Small dependency-free on/off toggle (the shadcn Switch needs a radix package
// that isn't installed).
function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email?: string | null
}

export default function ShareDialog({ open, onOpenChange, email }: ShareDialogProps) {
  const { toast } = useToast()
  const [state, setState] = useState<ShareState | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load the current sharing state whenever the dialog opens.
  useEffect(() => {
    if (!open || !email) return
    setLoading(true)
    getShareState(email)
      .then(setState)
      .catch(() => toast({ title: "Error", description: "Couldn't load sharing settings.", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [open, email, toast])

  const url = state?.token ? shareUrl(state.token) : ""
  const live = !!state?.enabled && !!state?.token

  const run = async (fn: () => Promise<ShareState>) => {
    if (!email) return
    setBusy(true)
    try {
      setState(await fn())
    } catch {
      toast({ title: "Error", description: "That didn't work. Please try again.", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const toggle = (checked: boolean) => run(() => (checked ? enableShare(email!) : disableShare(email!)))

  const regenerate = () =>
    run(async () => {
      const s = await regenerateShare(email!)
      toast({ title: "New link created", description: "The old link no longer works." })
      return s
    })

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: "Error", description: "Couldn't copy the link.", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share your resume</DialogTitle>
          <DialogDescription>
            Create a private link that anyone can open to view and download your resume — no account needed. Turn it
            off anytime.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sharing settings…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Public link</p>
                <p className="text-xs text-muted-foreground">
                  {live ? "Anyone with the link can view this resume." : "Sharing is off — the link is private."}
                </p>
              </div>
              <Toggle checked={live} disabled={busy} onChange={toggle} label="Toggle public link" />
            </div>

            {live && url && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={copy} aria-label="Copy link">
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Open the shared page
                  </a>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={regenerate} className="text-xs">
                    <RefreshCw className="mr-1 h-3 w-3" /> Reset link
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The shared page always reflects your latest saved resume. Only your resume is shown — never your email
                  or account details.
                </p>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
