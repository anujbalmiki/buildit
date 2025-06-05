"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { ResumeData } from "@/types/resume"

interface SaveGenerateProps {
  resumeData: ResumeData
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export default function SaveGenerate({ resumeData, isLoading, setIsLoading }: SaveGenerateProps) {
  const [email, setEmail] = useState("")
  const { toast } = useToast()

  const saveResume = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resume/${email}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resumeData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Resume saved successfully!",
        })
      } else {
        throw new Error("Failed to save resume")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generatePDF = async () => {
    setIsLoading(true)
    try {
      // Generate HTML content
      const makeLinksClickable = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s|]+)/g
        return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      }

      const formatDateRange = (item: any) => {
        const { start_month, start_year, end_type, end_month, end_year } = item

        if (!start_year || start_year === "") return ""

        const start = start_month && start_month !== "None" ? `${start_month} ${start_year}` : start_year

        if (end_type === "Present") {
          return `${start} - Present`
        } else if (end_type === "Specific Month" && end_year && end_year !== "") {
          const end = end_month && end_month !== "None" ? `${end_month} ${end_year}` : end_year
          return `${start} - ${end}`
        }

        return start
      }

      const getSectionContent = (section: any) => {
        const titleStyle = `text-align:${section.title_formatting?.alignment || "left"};font-size:${section.title_formatting?.font_size || 16}px;font-weight:${section.title_formatting?.font_weight || "bold"};`
        const contentStyle = `text-align:${section.content_formatting?.alignment || "left"};font-size:${section.content_formatting?.font_size || 14}px;font-weight:${section.content_formatting?.font_weight || "normal"};`

        switch (section.type) {
          case "paragraph":
            return `<div class='section-title' style='${titleStyle}'>${section.title}</div><p style='${contentStyle}'>${section.content}</p>`

          case "bullet_points":
            const items = (section.items || [])
              .map((item: string) => `<li style='${contentStyle}'>${item}</li>`)
              .join("")
            return `<div class='section-title' style='${titleStyle}'>${section.title}</div><ul>${items}</ul>`

          case "experience":
            const expItems = (section.items || [])
              .map((exp: any) => {
                const bullets = (exp.bullet_points || [])
                  .map((bullet: string) => `<li style='${contentStyle}'>${bullet}</li>`)
                  .join("")
                const dateHtml = formatDateRange(exp) ? `<span style='float:right;'>${formatDateRange(exp)}</span>` : ""
                const companyHtml = exp.company ? `, ${exp.company}` : ""
                return `<p style='${contentStyle}'><strong>${exp.position || ""}</strong>${companyHtml} ${dateHtml}</p><ul>${bullets}</ul>`
              })
              .join("")
            return `<div class='section-title' style='${titleStyle}'>${section.title}</div>${expItems}`

          case "education":
            const eduItems = (section.items || [])
              .map((edu: any) => {
                const dateHtml = formatDateRange(edu) ? `<span style='float:right;'>${formatDateRange(edu)}</span>` : ""
                const detailsHtml = edu.details ? `<p style='${contentStyle}'>${edu.details}</p>` : ""
                return `<p style='${contentStyle}'><strong>${edu.degree || ""}</strong>, ${edu.institution || ""} ${dateHtml}</p>${detailsHtml}`
              })
              .join("")
            return `<div class='section-title' style='${titleStyle}'>${section.title}</div>${eduItems}`

          default:
            return ""
        }
      }

      const sectionsHtml = resumeData.sections.map((section) => getSectionContent(section)).join("")
      const contactInfoHtml = makeLinksClickable(resumeData.contact_info)

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${resumeData.name} - ${resumeData.title} Resume</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: ${resumeData.pdf_settings.spacing};
                    color: #000;
                    background: #fff;
                    padding: 0;
                    margin: 0;
                    transform: scale(${resumeData.pdf_settings.scale});
                    zoom: ${resumeData.pdf_settings.zoom};
                }
                .resume-container {
                    max-width: 800px;
                    margin: auto;
                    padding: 0 25px 25px 25px;
                    border: none;
                }
                h1, h2 {
                    text-align: ${resumeData.formatting.name_alignment};
                    margin-bottom: 5px;
                }
                h1 {
                    font-size: 24px;
                    font-weight: ${resumeData.formatting.name_weight};
                }
                h2 {
                    font-size: 16px;
                    font-weight: normal;
                    margin-top: 0;
                }
                .section-title {
                    font-weight: bold;
                    margin-top: 20px;
                    border-bottom: 1px solid #000;
                    padding-bottom: 3px;
                    text-align: ${resumeData.formatting.section_title_alignment};
                }
                ul {
                    margin-top: 7px;
                    padding-left: 20px;
                }
                p {
                    margin: 6px 0;
                    text-align: ${resumeData.formatting.paragraph_alignment};
                }
                .contact {
                    text-align: center;
                    font-size: 14px;
                }
                a {
                    color: inherit;
                    text-decoration: none;
                }
                @media print {
                    body {
                        padding: 0;
                        margin: 0;
                    }
                    .resume-container {
                        padding: 20px;
                        max-width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="resume-container">
                <h1>${resumeData.name}</h1>
                <h2>${resumeData.title}</h2>
                <div class="contact">
                    ${contactInfoHtml}
                </div>
                ${sectionsHtml}
            </div>
        </body>
        </html>
      `

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: htmlContent,
          ...resumeData.pdf_settings,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `${resumeData.name.replace(/\s+/g, "_")}_Resume.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Success",
          description: "PDF generated and downloaded successfully!",
        })
      } else {
        throw new Error("Failed to generate PDF")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Save & Generate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="save-email">Your Email (to save your resume)</Label>
          <Input
            id="save-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
          />
        </div>

        <div className="flex gap-4">
          <Button onClick={saveResume} disabled={isLoading || !email} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Resume"}
          </Button>

          <Button onClick={generatePDF} disabled={isLoading} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            {isLoading ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
