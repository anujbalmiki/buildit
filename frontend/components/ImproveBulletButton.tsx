"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Sparkles } from "lucide-react"
import { useState } from "react"

interface ImproveBulletButtonProps {
  bullet: string
  jd?: string
  context?: string
  onImproved: (text: string) => void
}

export default function ImproveBulletButton({ bullet, jd, context, onImproved }: ImproveBulletButtonProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const improve = async () => {
    if (!bullet.trim()) {
      toast({ title: "Nothing to improve", description: "Write a bullet first, then improve it." })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/improve-bullet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bullet, jd: jd || "", context: context || "" }),
      })
      if (!res.ok) throw new Error("request failed")
      const data = await res.json()
      if (data.improved && data.improved !== bullet) onImproved(data.improved)
    } catch {
      toast({ title: "Error", description: "Couldn't improve that bullet. Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={improve}
      disabled={loading}
      title="Improve this bullet with AI — stronger verb, quantified impact, concise"
      aria-label="Improve this bullet with AI"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
    </Button>
  )
}
