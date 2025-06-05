"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import BasicInfoForm from "@/components/BasicInfoForm"
import SectionManager from "@/components/SectionManager"
import ResumePreview from "@/components/ResumePreview"
import FileUpload from "@/components/FileUpload"
import LoadResume from "@/components/LoadResume"
import SaveGenerate from "@/components/SaveGenerate"
import FormattingOptions from "@/components/FormattingOptions"
import { type ResumeData, defaultResumeData } from "@/types/resume"

export default function ResumeBuilder() {
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Wake up backend on component mount
  useEffect(() => {
    const wakeBackend = async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/wake`, {
          method: "GET",
        })
      } catch (error) {
        // Silently fail - backend might not be ready yet
      }
    }
    wakeBackend()
  }, [])

  const updateResumeData = (updates: Partial<ResumeData>) => {
    setResumeData((prev) => ({ ...prev, ...updates }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Buildit - AI Resume Builder</h1>
          <p className="text-lg text-gray-600">Create an ATS-friendly resume with your preferred formatting</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <LoadResume onResumeLoaded={(data) => setResumeData(data)} setIsLoading={setIsLoading} />

            <FileUpload onResumeLoaded={(data) => setResumeData(data)} setIsLoading={setIsLoading} />

            <BasicInfoForm resumeData={resumeData} updateResumeData={updateResumeData} />

            <SectionManager resumeData={resumeData} updateResumeData={updateResumeData} />

            <FormattingOptions resumeData={resumeData} updateResumeData={updateResumeData} />

            <SaveGenerate resumeData={resumeData} isLoading={isLoading} setIsLoading={setIsLoading} />
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
