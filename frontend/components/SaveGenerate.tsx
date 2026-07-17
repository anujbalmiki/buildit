"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { downloadResumePdf } from "@/lib/resumeExport"
import { collectAtsExpected, renderResumeHtml } from "@/lib/resumeTemplates"
import type { ResumeData } from "@/types/resume"
import { CheckCircle2, Download, Loader2, ScanLine, XCircle } from "lucide-react"
import { useState } from "react"

interface SaveGenerateProps {
  resumeData: ResumeData
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  template?: string
}

interface AtsReport {
  pass: boolean
  checks: {
    text_extracted: boolean
    word_count: number
    expected_found: number
    expected_total: number
    reading_order_ok: boolean
    missing_from_extraction: string[]
    suspicious_glued_tokens: string[]
  }
  extracted_text: string
}

export default function SaveGenerate({ resumeData, isLoading, setIsLoading, template }: SaveGenerateProps) {
  const { toast } = useToast()

  const [atsLoading, setAtsLoading] = useState(false)
  const [atsReport, setAtsReport] = useState<AtsReport | null>(null)
  const [showExtracted, setShowExtracted] = useState(false)

  const generatePDF = async () => {
    setIsLoading(true)
    try {
      await downloadResumePdf(resumeData, template)
      toast({ title: "Success", description: "PDF generated and downloaded successfully!" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const runAtsCheck = async () => {
    setAtsLoading(true)
    setAtsReport(null)
    try {
      const html = renderResumeHtml(resumeData, template)
      const expected = collectAtsExpected(resumeData)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ats-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, expected }),
      })
      if (!response.ok) throw new Error("ATS check failed")
      setAtsReport(await response.json())
    } catch (error) {
      toast({ title: "Error", description: "Could not run the ATS check. Please try again.", variant: "destructive" })
    } finally {
      setAtsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Download your resume as a PDF. When you&apos;re signed in, edits save to your account automatically.
        </p>

        <Button onClick={generatePDF} disabled={isLoading} className="w-full">
          <Download className="w-4 h-4 mr-2" />
          {isLoading ? "Generating..." : "Generate PDF"}
        </Button>

        {/* ATS readability self-check */}
        <div className="border-t border-border pt-4">
          <Button onClick={runAtsCheck} disabled={atsLoading} variant="outline" className="w-full">
            {atsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
            {atsLoading ? "Checking…" : "Check ATS Readability"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Renders your PDF and reads it back with the same parser an ATS uses, to confirm the text extracts cleanly.
          </p>

          {atsReport && (
            <div className="mt-3 rounded-md border border-border p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {atsReport.pass ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Passed — ATS-readable</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600 dark:text-red-400">Issues found</span>
                  </>
                )}
              </div>

              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>Text extracted: {atsReport.checks.text_extracted ? "yes" : "no"} ({atsReport.checks.word_count} words)</li>
                <li>Key content found: {atsReport.checks.expected_found}/{atsReport.checks.expected_total}</li>
                <li>Reading order preserved: {atsReport.checks.reading_order_ok ? "yes" : "no"}</li>
              </ul>

              {atsReport.checks.missing_from_extraction.length > 0 && (
                <p className="mt-2 text-red-600 dark:text-red-400">
                  Not detected by the parser: {atsReport.checks.missing_from_extraction.join(", ")}
                </p>
              )}

              <button
                onClick={() => setShowExtracted((v) => !v)}
                className="mt-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {showExtracted ? "Hide" : "Show"} what the ATS sees
              </button>
              {showExtracted && (
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs text-foreground">
                  {atsReport.extracted_text}
                </pre>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
