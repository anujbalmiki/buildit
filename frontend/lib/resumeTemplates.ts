import type { ResumeData } from "@/types/resume"

export interface TemplateMeta {
  id: string
  name: string
  blurb: string
}

// All templates are single-column with real text and standard fonts — the
// only layout family that parses cleanly through ATS. They differ in
// typography, header treatment, spacing, and accent.
export const TEMPLATES: TemplateMeta[] = [
  { id: "original", name: "Original", blurb: "The original Buildit layout — Arial, centered header, underlined section titles." },
  { id: "modern", name: "Modern", blurb: "Sans-serif, left-aligned header, thin accent rule. Great for tech." },
  { id: "classic", name: "Classic", blurb: "Serif, centered header. Conservative fields (finance, academia, law)." },
  { id: "compact", name: "Compact", blurb: "Tighter spacing — fits more on one page. Good for senior roles." },
]

export const DEFAULT_TEMPLATE = "original"

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function linkify(escaped: string): string {
  return escaped.replace(
    /(https?:\/\/[^\s|]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  )
}

function stripProto(url: string): string {
  return (url || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "")
}

function link(url: string): string {
  const u = url.trim()
  const href = /^https?:\/\//.test(u) ? u : `https://${u}`
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(stripProto(u))}</a>`
}

function formatDateRange(item: any): string {
  const { start_month, start_year, end_type, end_month, end_year } = item || {}
  if (!start_year || start_year === "" || start_year === "None") return ""
  const start = start_month && start_month !== "None" ? `${start_month} ${start_year}` : start_year
  if (end_type === "Present") return `${start} - Present`
  if (end_type === "Specific Month" && end_year && end_year !== "" && end_year !== "None") {
    const end = end_month && end_month !== "None" ? `${end_month} ${end_year}` : end_year
    return `${start} - ${end}`
  }
  return `${start}`
}

function entryHead(title: string, org: string, dates: string): string {
  const orgHtml = org ? `<span class="org">, ${escapeHtml(org)}</span>` : ""
  const dateHtml = dates ? `<span class="dates">${escapeHtml(dates)}</span>` : ""
  return `<p class="entry-head"><strong class="role">${escapeHtml(title)}</strong>${orgHtml}${dateHtml}</p>`
}

function renderSection(section: any): string {
  const title = section.title ? `<h2 class="section-title">${escapeHtml(section.title)}</h2>` : ""

  switch (section.type) {
    case "paragraph":
      return `<section class="block">${title}<p class="para">${escapeHtml(section.content || "")}</p></section>`

    case "bullet_points": {
      const items = (section.items || [])
        .filter((i: string) => i && String(i).trim())
        .map((i: string) => `<li>${escapeHtml(String(i))}</li>`)
        .join("")
      return `<section class="block">${title}<ul class="bullets">${items}</ul></section>`
    }

    case "experience": {
      const entries = (section.items || [])
        .map((exp: any) => {
          const bullets = (exp.bullet_points || [])
            .filter((b: string) => b && b.trim())
            .map((b: string) => `<li>${escapeHtml(b)}</li>`)
            .join("")
          const list = bullets ? `<ul class="bullets">${bullets}</ul>` : ""
          return `<div class="entry">${entryHead(exp.position || "", exp.company || "", formatDateRange(exp))}${list}</div>`
        })
        .join("")
      return `<section class="block">${title}${entries}</section>`
    }

    case "education": {
      const entries = (section.items || [])
        .map((edu: any) => {
          const details = edu.details ? `<p class="details">${escapeHtml(edu.details)}</p>` : ""
          return `<div class="entry">${entryHead(edu.degree || "", edu.institution || "", formatDateRange(edu))}${details}</div>`
        })
        .join("")
      return `<section class="block">${title}${entries}</section>`
    }

    case "project": {
      const entries = (section.items || [])
        .map((p: any) => {
          const links: string[] = []
          if (p.github && p.github.trim()) links.push(link(p.github))
          if (p.link && p.link.trim()) links.push(link(p.link))
          const linksHtml = links.length ? `<span class="links"> · ${links.join(" · ")}</span>` : ""
          const dates = formatDateRange(p)
          const dateHtml = dates ? `<span class="dates">${escapeHtml(dates)}</span>` : ""
          const head = `<p class="entry-head"><strong class="role">${escapeHtml(p.name || "")}</strong>${linksHtml}${dateHtml}</p>`
          const tech = p.tech && p.tech.trim() ? `<p class="tech">Stack: ${escapeHtml(p.tech)}</p>` : ""
          const bullets = (p.bullet_points || [])
            .filter((b: string) => b && b.trim())
            .map((b: string) => `<li>${escapeHtml(b)}</li>`)
            .join("")
          const list = bullets ? `<ul class="bullets">${bullets}</ul>` : ""
          return `<div class="entry">${head}${tech}${list}</div>`
        })
        .join("")
      return `<section class="block">${title}${entries}</section>`
    }

    default:
      return ""
  }
}

// Shared base CSS (scoped under .resume so it never leaks into the app UI).
const BASE_CSS = `
.resume { color: #000; background: #fff; max-width: 800px; margin: 0 auto; }
.resume * { box-sizing: border-box; }
.resume .name { margin: 0 0 2px; font-size: 24px; }
.resume .title { margin: 0 0 6px; font-size: 15px; font-weight: normal; color: #222; }
.resume .contact { font-size: 13px; color: #222; }
.resume .contact a { color: inherit; text-decoration: none; }
.resume .block { margin-top: 16px; }
.resume .section-title { font-size: 14px; margin: 0 0 6px; }
.resume .entry { margin-bottom: 8px; }
.resume .entry-head { margin: 4px 0 2px; }
.resume .dates { float: right; font-weight: normal; }
.resume .para, .resume .details { margin: 4px 0; }
.resume .tech { margin: 2px 0; font-style: italic; color: #333; }
.resume .links { font-weight: normal; font-size: 12px; }
.resume .links a { color: inherit; text-decoration: none; }
.resume ul.bullets { margin: 4px 0 4px; padding-left: 20px; list-style-type: disc; list-style-position: outside; }
.resume ul.bullets li { display: list-item; margin: 2px 0; }

/* Pagination control for the PDF: keep entries whole, don't strand a heading
   at the bottom of a page, and never leave a single dangling line of a
   paragraph across a page break. */
.resume .entry { break-inside: avoid; page-break-inside: avoid; }
.resume ul.bullets li { break-inside: avoid; page-break-inside: avoid; }
.resume .section-title { break-after: avoid; page-break-after: avoid; }
.resume .entry-head { break-after: avoid; page-break-after: avoid; }
.resume .para, .resume .details { orphans: 2; widows: 2; }
`

const TEMPLATE_CSS: Record<string, string> = {
  original: `
.resume { font-family: Arial, Helvetica, sans-serif; line-height: 1.3; }
.resume .resume-header { text-align: center; margin-bottom: 8px; }
.resume .name { font-weight: bold; font-size: 24px; }
.resume .title { font-size: 16px; font-weight: normal; color: #000; }
.resume .contact { text-align: center; }
.resume .section-title { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; }
`,
  modern: `
.resume { font-family: "Helvetica Neue", Arial, sans-serif; line-height: 1.35; }
.resume .resume-header { text-align: left; margin-bottom: 6px; }
.resume .name { font-weight: 700; color: #1f2937; }
.resume .title { color: #2563eb; font-weight: 600; }
.resume .section-title { text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700;
  color: #1f2937; border-bottom: 2px solid #2563eb; padding-bottom: 3px; }
`,
  classic: `
.resume { font-family: Georgia, "Times New Roman", serif; line-height: 1.4; }
.resume .resume-header { text-align: center; margin-bottom: 8px; }
.resume .name { font-weight: 700; }
.resume .section-title { font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 3px; }
`,
  compact: `
.resume { font-family: Arial, Helvetica, sans-serif; line-height: 1.15; font-size: 13px; }
.resume .resume-header { text-align: left; margin-bottom: 4px; }
.resume .name { font-size: 21px; font-weight: 700; }
.resume .block { margin-top: 10px; }
.resume .section-title { font-size: 13px; font-weight: 700; border-bottom: 1px solid #444;
  padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.03em; }
.resume .entry { margin-bottom: 5px; }
.resume ul.bullets li { margin: 1px 0; }
`,
}

/** Render the resume as a self-contained HTML fragment (style + markup).
 *  Works both injected into the live preview and sent to WeasyPrint / the
 *  ATS check. */
export function renderResumeHtml(data: ResumeData, templateId: string = DEFAULT_TEMPLATE): string {
  const css = BASE_CSS + (TEMPLATE_CSS[templateId] || TEMPLATE_CSS[DEFAULT_TEMPLATE])
  const sections = (data.sections || []).map(renderSection).join("")
  const contact = data.contact_info ? `<p class="contact">${linkify(escapeHtml(data.contact_info))}</p>` : ""

  return `<style>${css}</style>
<div class="resume">
  <header class="resume-header">
    <h1 class="name">${escapeHtml(data.name || "")}</h1>
    <p class="title">${escapeHtml(data.title || "")}</p>
    ${contact}
  </header>
  ${sections}
</div>`
}

/** Key phrases that should survive PDF text extraction, for the ATS check. */
export function collectAtsExpected(data: ResumeData): string[] {
  const out: string[] = []
  if (data.name) out.push(data.name)
  if (data.title) out.push(data.title)
  const email = (data.contact_info || "").match(/[^\s@|]+@[^\s@|]+\.[^\s@|]+/)
  if (email) out.push(email[0])
  for (const s of data.sections || []) {
    if (s.title) out.push(s.title)
    if (s.type === "paragraph" && s.content) out.push(s.content.slice(0, 60))
    if (s.type === "bullet_points" && s.items?.[0]) out.push(String(s.items[0]))
    if (s.type === "experience") {
      const first: any = s.items?.[0]
      if (first?.position) out.push(first.position)
      if (first?.bullet_points?.[0]) out.push(first.bullet_points[0])
    }
    if (s.type === "education") {
      const first: any = s.items?.[0]
      if (first?.degree) out.push(first.degree)
    }
    if (s.type === "project") {
      const first: any = s.items?.[0]
      if (first?.name) out.push(first.name)
      if (first?.bullet_points?.[0]) out.push(first.bullet_points[0])
    }
  }
  // De-dupe and drop very short phrases (weak signal).
  return Array.from(new Set(out.filter((p) => p && p.trim().length >= 3)))
}
