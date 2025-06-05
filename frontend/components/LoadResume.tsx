"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { ResumeData } from "@/types/resume"

interface LoadResumeProps {
  onResumeLoaded: (data: ResumeData) => void
  setIsLoading: (loading: boolean) => void
}

export default function LoadResume({ onResumeLoaded, setIsLoading }: LoadResumeProps) {
  const [email, setEmail] = useState("")
  const { toast } = useToast()

  const loadResume = async () => {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resume/${email}`)

      if (response.ok) {
        const resumeData = await response.json()
        onResumeLoaded(resumeData)
        toast({
          title: "Success",
          description: "Resume loaded successfully!",
        })
      } else if (response.status === 404) {
        toast({
          title: "Not found",
          description: "No resume found for this email address",
          variant: "destructive",
        })
      } else {
        throw new Error("Failed to load resume")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Load Existing Resume</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="load-email">Email Address</Label>
          <Input
            id="load-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email to load your resume"
          />
        </div>
        <Button onClick={loadResume} className="w-full">
          Load Resume
        </Button>
      </CardContent>
    </Card>
  )
}
