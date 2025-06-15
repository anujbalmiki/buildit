"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { ResumeData, ResumeSection } from "@/types/resume"
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import BulletPointsSection from "./sections/BulletPointsSection"
import EducationSection from "./sections/EducationSection"
import ExperienceSection from "./sections/ExperienceSection"
import ParagraphSection from "./sections/ParagraphSection"

interface SectionManagerProps {
  resumeData: ResumeData
  updateResumeData: (updates: Partial<ResumeData>) => void
}

export default function SectionManager({ resumeData, updateResumeData }: SectionManagerProps) {
  const [newSectionType, setNewSectionType] = useState<string>("")
  const [jdModalOpen, setJdModalOpen] = useState(false)
  const [jobDescription, setJobDescription] = useState("")
  const [loadingRewrite, setLoadingRewrite] = useState(false)
  const [rewriteError, setRewriteError] = useState<string | null>(null)
  const [rewriteSectionIndex, setRewriteSectionIndex] = useState<number | null>(null)
  const [sectionJDModalOpen, setSectionJDModalOpen] = useState(false)
  const [sectionJobDescription, setSectionJobDescription] = useState("")
  const [loadingSectionRewrite, setLoadingSectionRewrite] = useState(false)
  const [sectionRewriteError, setSectionRewriteError] = useState<string | null>(null)
  const [useJDForRewrite, setUseJDForRewrite] = useState(true)
  const [useJDForSectionRewrite, setUseJDForSectionRewrite] = useState(true)
  const [coverLetterJD, setCoverLetterJD] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false)
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null)

  const sectionTypes = {
    "": "Select section type",
    paragraph: "Paragraph",
    bullet_points: "Bullet Points",
    experience: "Experience",
    education: "Education",
  }

  const addNewSection = () => {
    if (!newSectionType) return

    const newSection: ResumeSection = {
      type: newSectionType as any,
      title: "",
      content: "",
      title_formatting: {
        alignment: "left",
        font_size: 16,
        font_weight: "bold",
      },
      content_formatting: {
        alignment: "left",
        font_size: 14,
        font_weight: "normal",
      },
    }

    if (newSectionType === "bullet_points") {
      newSection.items = [""]
    } else if (newSectionType === "experience") {
      newSection.items = [
        {
          position: "",
          company: "",
          start_month: "",
          start_year: "",
          end_type: "None" as const,
          end_month: "",
          end_year: "",
          bullet_points: [""],
        },
      ]
    } else if (newSectionType === "education") {
      newSection.items = [
        {
          degree: "",
          institution: "",
          start_month: "",
          start_year: "",
          end_type: "None" as const,
          end_month: "",
          end_year: "",
          details: "",
        },
      ]
    }

    const updatedSections = [...(resumeData.sections || []), newSection]
    updateResumeData({ sections: updatedSections })
    setNewSectionType("")
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    const sections = [...(resumeData.sections || [])]
    const newIndex = direction === "up" ? index - 1 : index + 1

    if (newIndex >= 0 && newIndex < sections.length) {
      ;[sections[index], sections[newIndex]] = [sections[newIndex], sections[index]]
      updateResumeData({ sections })
    }
  }

  const removeSection = (index: number) => {
    const sections = (resumeData.sections || []).filter((_, i) => i !== index)
    updateResumeData({ sections })
  }

  const updateSection = (index: number, updates: Partial<ResumeSection>) => {
    const sections = [...(resumeData.sections || [])]
    sections[index] = { ...sections[index], ...updates }
    updateResumeData({ sections })
  }

  const renderSection = (section: ResumeSection, index: number) => {
    const commonProps = {
      section,
      index,
      updateSection: (updates: Partial<ResumeSection>) => updateSection(index, updates),
    }

    switch (section.type) {
      case "paragraph":
        return <ParagraphSection key={index} {...commonProps} />
      case "bullet_points":
        return <BulletPointsSection key={index} {...commonProps} />
      case "experience":
        return <ExperienceSection key={index} {...commonProps} />
      case "education":
        return <EducationSection key={index} {...commonProps} />
      default:
        return null
    }
  }

  // Call backend to rewrite resume
  const handleRewriteResume = async () => {
    setLoadingRewrite(true)
    setRewriteError(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rewrite-resume-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: useJDForRewrite ? jobDescription : "",
          resume: resumeData,
        }),
      })
      if (!res.ok) throw new Error("Failed to rewrite resume")
      const data = await res.json()
      if (!data.sections) throw new Error("No sections in rewritten resume")
      updateResumeData({ ...data })
      setJdModalOpen(false)
      setJobDescription("")
    } catch (err: any) {
      setRewriteError(err.message || "Unknown error")
    } finally {
      setLoadingRewrite(false)
    }
  }

  // Call backend to rewrite specific section
  const handleRewriteSection = async () => {
    if (rewriteSectionIndex === null) return

    setLoadingSectionRewrite(true)
    setSectionRewriteError(null)
    try {
      const section = resumeData.sections?.[rewriteSectionIndex]
      if (!section) throw new Error("Section not found")

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rewrite-section-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: useJDForSectionRewrite ? sectionJobDescription : "",
          section,
        }),
      })
      if (!res.ok) throw new Error("Failed to rewrite section")
      const data = await res.json()
      updateSection(rewriteSectionIndex, data)
      setSectionJDModalOpen(false)
      setSectionJobDescription("")
    } catch (err: any) {
      setSectionRewriteError(err.message || "Unknown error")
    } finally {
      setLoadingSectionRewrite(false)
    }
  }

  // Call backend to generate cover letter
  const handleGenerateCoverLetter = async () => {
    setLoadingCoverLetter(true);
    setCoverLetterError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-cover-letter-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: coverLetterJD,
          resume: resumeData,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate cover letter");
      const data = await res.json();
      setCoverLetter(data.cover_letter || data.coverLetter || ""); // handle both snake_case and camelCase
    } catch (err: any) {
      setCoverLetterError(err.message || "Unknown error");
    } finally {
      setLoadingCoverLetter(false);
    }
  }

  const handleDownloadCoverLetter = () => {
    import("jspdf").then(jsPDF => {
      const doc = new jsPDF.jsPDF({
        unit: "pt",
        format: "a4"
      });
      const marginLeft = 40;
      const marginTop = 60;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - marginLeft * 2;

      doc.setFontSize(12);
      doc.text(coverLetter, marginLeft, marginTop, {
        maxWidth: maxWidth,
        align: "left"
      });

      doc.save("cover_letter.pdf");
    });
  }

  return (
    <>
      {/* JD Modal */}
      <Dialog open={jdModalOpen} onOpenChange={setJdModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste Job Description (optional)</DialogTitle>
          </DialogHeader>
          <Textarea
            value={jobDescription}
            onChange={e => {setJobDescription(e.target.value), setCoverLetterJD(e.target.value), setSectionJobDescription(e.target.value)}}
            placeholder="Paste the job description here (optional)..."
            rows={8}
          />
          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              checked={useJDForRewrite}
              onCheckedChange={checked => setUseJDForRewrite(checked === true)}
              id="use-jd-rewrite"
            />
            <label htmlFor="use-jd-rewrite" className="text-sm">
              Rewrite using Job Description (if provided)
            </label>
          </div>
          {rewriteError && <div className="text-red-500 text-sm">{rewriteError}</div>}
          <DialogFooter>
            <Button
              onClick={handleRewriteResume}
              disabled={loadingRewrite}
            >
              {loadingRewrite && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
              Rewrite Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section JD Modal */}
      <Dialog open={sectionJDModalOpen} onOpenChange={setSectionJDModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste Job Description for Section (optional)</DialogTitle>
          </DialogHeader>
          <Textarea
            value={sectionJobDescription}
            onChange={e => {setSectionJobDescription(e.target.value), setJobDescription(e.target.value), setCoverLetterJD(e.target.value)}}
            placeholder="Paste the job description for this section (optional)..."
            rows={8}
          />
          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              checked={useJDForSectionRewrite}
              onCheckedChange={checked => setUseJDForSectionRewrite(checked === true)}
              id="use-jd-section-rewrite"
            />
            <label htmlFor="use-jd-section-rewrite" className="text-sm">
              Rewrite using Job Description (if provided)
            </label>
          </div>
          {sectionRewriteError && <div className="text-red-500 text-sm">{sectionRewriteError}</div>}
          <DialogFooter>
            <Button
              onClick={handleRewriteSection}
              disabled={loadingSectionRewrite}
            >
              {loadingSectionRewrite && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
              Rewrite Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Section Manager UI */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resume Sections
            <Button
              className="ml-4"
              variant="outline"
              size="sm"
              onClick={() => setJdModalOpen(true)}
            >
              Paste JD & Rewrite Resume
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Section */}
          <div className="flex gap-2">
            <select
              value={newSectionType}
              onChange={(e) => setNewSectionType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {Object.entries(sectionTypes).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button onClick={addNewSection} disabled={!newSectionType}>
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </div>

          {/* Existing Sections */}
          <div className="space-y-4">
            {(resumeData.sections || []).map((section, index) => (
              <div key={index} className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{section.title || `Section ${index + 1}`}</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => moveSection(index, "up")} disabled={index === 0}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveSection(index, "down")}
                      disabled={index === (resumeData.sections || []).length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => removeSection(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRewriteSectionIndex(index)
                        setSectionJDModalOpen(true)
                      }}
                    >
                      Rewrite with AI
                    </Button>
                  </div>
                </div>
                {renderSection(section, index)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Collapsible Cover Letter Section */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-gray-50 mt-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Cover Letter</CardTitle>
              <ChevronDown className="h-4 w-4" />
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Textarea
                value={coverLetterJD}
                onChange={e => {setCoverLetterJD(e.target.value), setJobDescription(e.target.value), setSectionJobDescription(e.target.value)}}
                placeholder="Paste the job description for the cover letter here..."
                rows={6}
              />
              <Button
                onClick={handleGenerateCoverLetter}
                disabled={loadingCoverLetter}
              >
                {loadingCoverLetter ? "Generating..." : "Generate Cover Letter"}
              </Button>
              {coverLetterError && <div className="text-red-500 text-sm">{coverLetterError}</div>}
              <Textarea
                value={coverLetter}
                onChange={e => setCoverLetter(e.target.value)}
                rows={12}
                className="mb-2"
                placeholder="Your generated cover letter will appear here..."
              />
              <Button
                onClick={handleDownloadCoverLetter}
                disabled={!coverLetter}
              >
                Download as PDF
              </Button>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </>
  )
}
