"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { ResumeData } from "@/types/resume"

interface FileUploadProps {
  onResumeLoaded: (data: ResumeData) => void
  setIsLoading: (loading: boolean) => void
}

export default function FileUpload({ onResumeLoaded, setIsLoading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFiles = async (files: FileList) => {
    const file = files[0]
    if (!file) return

    if (
      !["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(
        file.type,
      )
    ) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or DOCX file",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/parse-resume`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const parsedData = await response.json()
        onResumeLoaded(parsedData)
        toast({
          title: "Success",
          description: "Resume parsed and autofilled! Please review and edit as needed.",
        })
      } else {
        throw new Error("Failed to parse resume")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload & Autofill from Existing Resume</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Upload your resume</p>
          <p className="text-sm text-gray-500 mb-4">Drag and drop your PDF or DOCX file here, or click to browse</p>
          <Button onClick={() => fileInputRef.current?.click()}>Choose File</Button>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleChange} className="hidden" />
        </div>
      </CardContent>
    </Card>
  )
}
