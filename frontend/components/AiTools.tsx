"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ResumeData } from "@/types/resume"
import { Loader2 } from "lucide-react"
import { useState } from "react"

interface AiToolsProps {
  resumeData: ResumeData
  updateResumeData: (updates: Partial<ResumeData>) => void
  jobDescription: string
  setJobDescription: (jd: string) => void
}

export default function AiTools({
  resumeData,
  updateResumeData,
  jobDescription,
  setJobDescription,
}: AiToolsProps) {
  const [loadingRewrite, setLoadingRewrite] = useState(false)
  const [rewriteError, setRewriteError] = useState<string | null>(null)

  const [coverLetter, setCoverLetter] = useState("")
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false)
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null)

  const handleRewriteResume = async () => {
    setLoadingRewrite(true)
    setRewriteError(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rewrite-resume-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: jobDescription, resume: resumeData }),
      })
      if (!res.ok) throw new Error("Failed to rewrite resume")
      const data = await res.json()
      if (!data.sections) throw new Error("No sections in rewritten resume")
      updateResumeData({ ...data })
    } catch (err: any) {
      setRewriteError(err.message || "Unknown error")
    } finally {
      setLoadingRewrite(false)
    }
  }

  const handleGenerateCoverLetter = async () => {
    setLoadingCoverLetter(true)
    setCoverLetterError(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-cover-letter-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: jobDescription, resume: resumeData }),
      })
      if (!res.ok) throw new Error("Failed to generate cover letter")
      const data = await res.json()
      setCoverLetter(data.cover_letter || "")
    } catch (err: any) {
      setCoverLetterError(err.message || "Unknown error")
    } finally {
      setLoadingCoverLetter(false)
    }
  }

  const handleDownloadCoverLetter = () => {
    import("jspdf").then((jsPDF) => {
      const doc = new jsPDF.jsPDF({ unit: "pt", format: "a4" })
      const marginLeft = 40
      const marginTop = 60
      const maxWidth = doc.internal.pageSize.getWidth() - marginLeft * 2
      doc.setFontSize(12)
      doc.text(coverLetter, marginLeft, marginTop, { maxWidth, align: "left" })
      doc.save("cover_letter.pdf")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="shared-jd">Job Description (optional)</Label>
          <Textarea
            id="shared-jd"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste a job description here. It's reused by all AI actions: full-resume rewrite, per-section rewrite, and the cover letter."
            rows={8}
          />
          <p className="text-sm text-muted-foreground">
            Leave empty to polish your existing content; add a JD to tailor it to a specific role.
          </p>
        </div>

        <div className="space-y-2">
          <Button onClick={handleRewriteResume} disabled={loadingRewrite}>
            {loadingRewrite && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            {loadingRewrite ? "Rewriting resume…" : "Rewrite Entire Resume"}
          </Button>
          {rewriteError && <div className="text-red-500 text-sm">{rewriteError}</div>}
        </div>

        <div className="border-t border-border" />

        <div className="space-y-3">
          <Label className="text-base font-semibold">Cover Letter</Label>
          <Button onClick={handleGenerateCoverLetter} disabled={loadingCoverLetter}>
            {loadingCoverLetter && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            {loadingCoverLetter ? "Generating…" : "Generate Cover Letter"}
          </Button>
          {coverLetterError && <div className="text-red-500 text-sm">{coverLetterError}</div>}
          <Textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={12}
            placeholder="Your generated cover letter will appear here. You can edit it before downloading."
          />
          <Button onClick={handleDownloadCoverLetter} disabled={!coverLetter} variant="outline">
            Download as PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
