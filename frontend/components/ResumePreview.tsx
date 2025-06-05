"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ResumeData } from "@/types/resume"

interface ResumePreviewProps {
  resumeData: ResumeData
}

export default function ResumePreview({ resumeData }: ResumePreviewProps) {
  const formatDateRange = (item: any) => {
    const { start_month, start_year, end_type, end_month, end_year } = item

    if (!start_year || start_year === "" || start_year === "None") return ""

    const start = start_month && start_month !== "None" ? `${start_month} ${start_year}` : start_year

    if (end_type === "Present") {
      return `${start} - Present`
    } else if (end_type === "Specific Month" && end_year && end_year !== "" && end_year !== "None") {
      const end = end_month && end_month !== "None" ? `${end_month} ${end_year}` : end_year
      return `${start} - ${end}`
    }

    return start
  }

  const makeLinksClickable = (text: string) => {
    if (!text) return ""
    const urlRegex = /(https?:\/\/[^\s|]+)/g
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
  }

  const getSectionHTML = (section: any) => {
    const titleStyle = `text-align:${section.title_formatting?.alignment || "left"};font-size:${section.title_formatting?.font_size || 16}px;font-weight:${section.title_formatting?.font_weight || "bold"};`
    const contentStyle = `text-align:${section.content_formatting?.alignment || "left"};font-size:${section.content_formatting?.font_size || 14}px;font-weight:${section.content_formatting?.font_weight || "normal"};`

    switch (section.type) {
      case "paragraph":
        return `<div class="section-title" style="${titleStyle}">${section.title || ""}</div><p style="${contentStyle}">${section.content || ""}</p>`

      case "bullet_points":
        const items = (section.items || [])
          .map((item: string) => `<li style="${contentStyle}">${item || ""}</li>`)
          .join("")
        return `<div class="section-title" style="${titleStyle}">${section.title || ""}</div><ul>${items}</ul>`

      case "experience":
        const expItems = (section.items || [])
          .map((exp: any) => {
            const bullets = (exp.bullet_points || [])
              .map((bullet: string) => `<li style="${contentStyle}">${bullet || ""}</li>`)
              .join("")
            const dateHtml = formatDateRange(exp) ? `<span style="float:right;">${formatDateRange(exp)}</span>` : ""
            const companyHtml = exp.company ? `, ${exp.company}` : ""
            return `<p style="${contentStyle}"><strong>${exp.position || ""}</strong>${companyHtml} ${dateHtml}</p><ul>${bullets}</ul>`
          })
          .join("")
        return `<div class="section-title" style="${titleStyle}">${section.title || ""}</div>${expItems}`

      case "education":
        const eduItems = (section.items || [])
          .map((edu: any) => {
            const dateHtml = formatDateRange(edu) ? `<span style="float:right;">${formatDateRange(edu)}</span>` : ""
            const detailsHtml = edu.details ? `<p style="${contentStyle}">${edu.details}</p>` : ""
            return `<p style="${contentStyle}"><strong>${edu.degree || ""}</strong>, ${edu.institution || ""} ${dateHtml}</p>${detailsHtml}`
          })
          .join("")
        return `<div class="section-title" style="${titleStyle}">${section.title || ""}</div>${eduItems}`

      default:
        return ""
    }
  }

  const sectionsHTML = (resumeData.sections || []).map((section) => getSectionHTML(section)).join("")
  const contactInfoHTML = makeLinksClickable(resumeData.contact_info || "")

  const resumeHTML = `
    <div style="font-family: Arial, sans-serif; line-height: 1.3; color: #000; background: #fff; padding: 0; margin: 0;">
      <div style="max-width: 800px; margin: auto; padding: 0 25px 25px 25px; border: none;">
        <h1 style="text-align: ${resumeData.formatting?.name_alignment || "center"}; margin-bottom: 5px; font-size: 24px; font-weight: ${resumeData.formatting?.name_weight || "bold"};">${resumeData.name || ""}</h1>
        <h2 style="text-align: ${resumeData.formatting?.name_alignment || "center"}; font-size: 16px; font-weight: normal; margin-top: 0;">${resumeData.title || ""}</h2>
        <div style="text-align: center; font-size: 14px;">
          ${contactInfoHTML}
        </div>
        ${sectionsHTML}
      </div>
    </div>
    <style>
      .section-title {
        font-weight: bold;
        margin-top: 20px;
        border-bottom: 1px solid #000;
        padding-bottom: 3px;
        text-align: ${resumeData.formatting?.section_title_alignment || "center"};
      }
      ul {
        margin-top: 7px;
        padding-left: 20px;
      }
      p {
        margin: 6px 0;
        text-align: ${resumeData.formatting?.paragraph_alignment || "left"};
      }
      a {
        color: inherit;
        text-decoration: none;
      }
    </style>
  `

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Resume Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="border rounded-lg p-4 bg-white min-h-[600px] max-h-[800px] overflow-auto"
          dangerouslySetInnerHTML={{ __html: resumeHTML }}
        />
      </CardContent>
    </Card>
  )
}
