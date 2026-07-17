import { renderResumeHtml } from "@/lib/resumeTemplates"
import type { ResumeData } from "@/types/resume"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

function resumeFileName(data: ResumeData): string {
  return `${(data.name || "resume").replace(/\s+/g, "_")}_Resume`
}

/** Render the resume and ask the backend (WeasyPrint) for the real PDF, then
 *  return an object URL for it. Callers own revoking the URL. Throws on failure.
 *  This is the single source of truth for what the resume actually looks like. */
export async function fetchResumePdfBlobUrl(data: ResumeData, template?: string): Promise<string> {
  const html = renderResumeHtml(data, template)
  const response = await fetch(`${BACKEND}/api/generate-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, ...data.pdf_settings }),
  })
  if (!response.ok) throw new Error("Failed to generate PDF")
  const blob = await response.blob()
  return window.URL.createObjectURL(blob)
}

/** Generate the PDF and trigger a download. Throws on failure. */
export async function downloadResumePdf(data: ResumeData, template?: string): Promise<void> {
  const url = await fetchResumePdfBlobUrl(data, template)
  try {
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = `${resumeFileName(data)}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    window.URL.revokeObjectURL(url)
  }
}
