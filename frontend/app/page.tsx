"use client"

import { useState, useEffect, useMemo } from "react"
import AiTools from "@/components/AiTools"
import AtsScore from "@/components/AtsScore"
import AuthButton from "@/components/AuthButton"
import ThemeToggle from "@/components/ThemeToggle"
import BasicInfoForm from "@/components/BasicInfoForm"
import SectionManager from "@/components/SectionManager"
import ResumePreview from "@/components/ResumePreview"
import FileUpload from "@/components/FileUpload"
import LoadResume from "@/components/LoadResume"
import SaveGenerate from "@/components/SaveGenerate"
import FormattingOptions from "@/components/FormattingOptions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { computeAtsScore } from "@/lib/ats"
import { type ResumeData, defaultResumeData } from "@/types/resume"

export default function ResumeBuilder() {
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData)
  const [jobDescription, setJobDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Wake up backend on component mount
  useEffect(() => {
    const wakeBackend = async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/wake`, { method: "GET" })
      } catch (error) {
        // Silently fail - backend might not be ready yet
      }
    }
    wakeBackend()
  }, [])

  const updateResumeData = (updates: Partial<ResumeData>) => {
    setResumeData((prev) => ({ ...prev, ...updates }))
  }

  const atsResult = useMemo(() => computeAtsScore(resumeData, jobDescription), [resumeData, jobDescription])

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="mb-4 flex justify-end gap-2">
            <ThemeToggle />
            <AuthButton />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">Buildit - AI Resume Builder</h1>
            <p className="text-lg text-muted-foreground">Create an ATS-friendly resume with your preferred formatting</p>
          </div>
        </div>

        <div className="mb-8">
          <AtsScore result={atsResult} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Editor (tabbed) */}
          <div>
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="ai">AI Tools</TabsTrigger>
                <TabsTrigger value="format">Format &amp; Export</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-6">
                <LoadResume onResumeLoaded={(data) => setResumeData(data)} setIsLoading={setIsLoading} />
                <FileUpload onResumeLoaded={(data) => setResumeData(data)} setIsLoading={setIsLoading} />
                <BasicInfoForm resumeData={resumeData} updateResumeData={updateResumeData} />
                <SectionManager
                  resumeData={resumeData}
                  updateResumeData={updateResumeData}
                  jobDescription={jobDescription}
                  sectionHints={atsResult.sectionHints}
                />
              </TabsContent>

              <TabsContent value="ai" className="space-y-6">
                <AiTools
                  resumeData={resumeData}
                  updateResumeData={updateResumeData}
                  jobDescription={jobDescription}
                  setJobDescription={setJobDescription}
                />
              </TabsContent>

              <TabsContent value="format" className="space-y-6">
                <FormattingOptions resumeData={resumeData} updateResumeData={updateResumeData} />
                <SaveGenerate resumeData={resumeData} isLoading={isLoading} setIsLoading={setIsLoading} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <ResumePreview resumeData={resumeData} />
          </div>
        </div>
      </div>
    </div>
  )
}
