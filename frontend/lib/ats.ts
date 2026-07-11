import type { ResumeData, ResumeSection } from "@/types/resume"

export interface AtsCheck {
  id: string
  label: string
  passed: boolean
  points: number
  max: number
  hint?: string
}

export type AtsBand = "poor" | "fair" | "good" | "strong"

export interface AtsResult {
  score: number
  band: AtsBand
  summary: string
  checks: AtsCheck[]
  topHints: string[]
  sectionHints: Record<number, string[]>
}

const ACTION_VERBS = new Set([
  "built", "led", "managed", "developed", "designed", "created", "implemented", "improved",
  "increased", "reduced", "launched", "delivered", "owned", "drove", "architected", "automated",
  "optimized", "migrated", "scaled", "shipped", "mentored", "coordinated", "analyzed", "engineered",
  "established", "streamlined", "spearheaded", "achieved", "generated", "deployed", "maintained",
  "integrated", "refactored", "resolved", "collaborated", "initiated", "executed", "oversaw",
  "produced", "led", "founded", "directed", "orchestrated", "accelerated", "cut", "grew", "saved",
])

const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "our", "are", "will", "have", "this", "that", "from", "your",
  "who", "all", "can", "a", "an", "to", "of", "in", "on", "as", "is", "be", "or", "we", "at",
  "by", "it", "us", "if", "so", "do", "up", "role", "team", "work", "working", "years", "experience",
  "ability", "strong", "good", "excellent", "including", "etc", "job", "candidate", "responsibilities",
  "requirements", "plus", "skills", "knowledge", "understanding", "using", "across", "within", "must",
])

const hasEmail = (s: string) => /[^\s@|]+@[^\s@|]+\.[^\s@|]+/.test(s)
const hasPhone = (s: string) => /(\+?\d[\d\s().-]{7,}\d)/.test(s)
const hasNumber = (s: string) => /\d/.test(s) || /[%$]/.test(s)

const firstWord = (s: string) => s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") || ""

function experienceSections(sections: ResumeSection[]) {
  return sections.filter((s) => s.type === "experience")
}

function allExperienceBullets(sections: ResumeSection[]): string[] {
  const bullets: string[] = []
  for (const s of sections) {
    if (s.type === "experience") {
      for (const item of s.items || []) {
        for (const b of item?.bullet_points || []) {
          if (b && b.trim()) bullets.push(b)
        }
      }
    } else if (s.type === "bullet_points") {
      for (const b of s.items || []) {
        if (b && String(b).trim()) bullets.push(String(b))
      }
    }
  }
  return bullets
}

function jdKeywords(jd: string): string[] {
  const words = (jd.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) || []).filter((w) => !STOPWORDS.has(w))
  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1)
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w)
}

function bandFor(score: number): AtsBand {
  if (score >= 85) return "strong"
  if (score >= 70) return "good"
  if (score >= 50) return "fair"
  return "poor"
}

export function computeAtsScore(resume: ResumeData, jobDescription = ""): AtsResult {
  const sections = resume.sections || []
  const contact = resume.contact_info || ""
  const expSections = experienceSections(sections)
  const bullets = allExperienceBullets(sections)
  const resumeText = [
    resume.name, resume.title, contact,
    ...sections.map((s) => `${s.title} ${s.content || ""} ${JSON.stringify(s.items || [])}`),
  ].join(" ").toLowerCase()

  const checks: AtsCheck[] = []
  const add = (id: string, label: string, ratioOrBool: number | boolean, max: number, hint?: string) => {
    const ratio = typeof ratioOrBool === "boolean" ? (ratioOrBool ? 1 : 0) : ratioOrBool
    const points = Math.round(max * ratio)
    checks.push({ id, label, passed: ratio >= 0.6, points, max, hint: ratio >= 0.6 ? undefined : hint })
  }

  add("name", "Name present", !!resume.name && resume.name !== "Full Name", 4, "Add your full name.")
  add("title", "Professional title", !!resume.title && resume.title !== "Professional Title", 3, "Add a target job title below your name.")
  add("email", "Email in contact info", hasEmail(contact), 6, "Add a professional email to your contact line.")
  add("phone", "Phone in contact info", hasPhone(contact), 5, "Add a phone number to your contact line.")

  add("experience", "Has an experience section", expSections.length > 0, 12, "Add a Work Experience section — the most important part for ATS.")

  const entriesWithBullets = expSections.flatMap((s) => s.items || []).filter((i) => (i?.bullet_points || []).some((b: string) => b && b.trim()))
  const totalEntries = expSections.flatMap((s) => s.items || []).length
  add("bullets", "Experience uses bullet points", totalEntries ? entriesWithBullets.length / totalEntries : 0, 10, "Describe each role with 2–4 achievement bullet points.")

  const verbRatio = bullets.length ? bullets.filter((b) => ACTION_VERBS.has(firstWord(b))).length / bullets.length : 0
  add("verbs", "Bullets start with action verbs", verbRatio, 12, "Start each bullet with a strong action verb (Built, Led, Reduced…).")

  const numRatio = bullets.length ? bullets.filter(hasNumber).length / bullets.length : 0
  add("metrics", "Bullets are quantified", numRatio, 12, "Add measurable impact — numbers, %, $, time saved, or counts.")

  const entriesWithDates = expSections.flatMap((s) => s.items || []).filter((i) => i?.start_year && i.start_year !== "None")
  add("dates", "Experience has dates", totalEntries ? entriesWithDates.length / totalEntries : 0, 8, "Add start/end dates to each role.")

  add("education", "Has an education section", sections.some((s) => s.type === "education"), 6, "Add an Education section.")

  const skillsSection = sections.find((s) => s.type === "bullet_points" || /skill/i.test(s.title || ""))
  add("skills", "Has a skills section", !!skillsSection, 8, "Add a Skills section listing tools and technologies (great for keyword matching).")

  const longBullets = bullets.filter((b) => b.length > 220).length
  add("concise", "Bullets are concise", bullets.length ? 1 - longBullets / bullets.length : 1, 5, "Shorten long bullets to one line each so ATS parses them cleanly.")

  // JD keyword coverage — only when a job description is provided.
  let jdHint: string | undefined
  if (jobDescription.trim()) {
    const keywords = jdKeywords(jobDescription)
    const missing = keywords.filter((k) => !resumeText.includes(k))
    const coverage = keywords.length ? (keywords.length - missing.length) / keywords.length : 1
    if (missing.length) jdHint = `Consider adding keywords from the job description: ${missing.slice(0, 8).join(", ")}.`
    add("jd", "Matches job-description keywords", coverage, 10, jdHint)
  }

  const earned = checks.reduce((sum, c) => sum + c.points, 0)
  const maxApplicable = checks.reduce((sum, c) => sum + c.max, 0)
  const score = Math.round((earned / maxApplicable) * 100)
  const band = bandFor(score)

  const topHints = checks
    .filter((c) => !c.passed && c.hint)
    .sort((a, b) => b.max - a.max)
    .map((c) => c.hint as string)

  // Per-section improvement pointers.
  const sectionHints: Record<number, string[]> = {}
  sections.forEach((s, i) => {
    const hints: string[] = []
    if (s.type === "experience") {
      const items = s.items || []
      if (items.some((it) => !(it?.bullet_points || []).some((b: string) => b && b.trim())))
        hints.push("Add 2–4 achievement bullets to each role.")
      const secBullets = items.flatMap((it) => it?.bullet_points || []).filter((b: string) => b && b.trim())
      if (secBullets.length && secBullets.filter((b: string) => ACTION_VERBS.has(firstWord(b))).length / secBullets.length < 0.6)
        hints.push("Start bullets with action verbs (Built, Led, Reduced…).")
      if (secBullets.length && secBullets.filter(hasNumber).length / secBullets.length < 0.6)
        hints.push("Quantify impact with numbers, %, or $.")
      if (items.some((it) => !it?.start_year || it.start_year === "None"))
        hints.push("Add start/end dates for each role.")
    } else if (s.type === "education") {
      const items = s.items || []
      if (items.some((it) => !it?.degree || !it?.institution))
        hints.push("Add degree and institution for each entry.")
      if (items.some((it) => !it?.start_year || it.start_year === "None"))
        hints.push("Add attendance/graduation dates.")
    } else if (s.type === "bullet_points") {
      const items = (s.items || []).filter((b: string) => b && String(b).trim())
      if (items.length < 5) hints.push("List more relevant skills/keywords (aim for 6–12).")
    } else if (s.type === "paragraph") {
      if (!s.content || !s.content.trim()) hints.push("Add a 2–3 line summary, or remove this empty section.")
      else if (s.content.length > 600) hints.push("Trim this to 2–3 concise lines.")
    }
    if (hints.length) sectionHints[i] = hints
  })

  const summary =
    band === "strong" ? "Strong — your resume covers the key ATS signals."
    : band === "good" ? "Good — a few tweaks will make it ATS-strong."
    : band === "fair" ? "Fair — several improvements will help it pass ATS filters."
    : "Needs work — add the essentials below to get past ATS filters."

  return { score, band, summary, checks, topHints, sectionHints }
}
