"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { ResumeData } from "@/types/resume"

interface BasicInfoFormProps {
  resumeData: ResumeData
  updateResumeData: (updates: Partial<ResumeData>) => void
}

export default function BasicInfoForm({ resumeData, updateResumeData }: BasicInfoFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={resumeData.name}
              onChange={(e) => updateResumeData({ name: e.target.value })}
              placeholder="Enter your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Professional Title</Label>
            <Input
              id="title"
              value={resumeData.title}
              onChange={(e) => updateResumeData({ title: e.target.value })}
              placeholder="Enter your professional title"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact">Contact Information</Label>
          <Textarea
            id="contact"
            value={resumeData.contact_info}
            onChange={(e) => updateResumeData({ contact_info: e.target.value })}
            placeholder="Separate items with '|' (e.g., email@example.com | (555) 123-4567 | City, State)"
            rows={3}
          />
          <p className="text-sm text-gray-500">Separate contact items with '|' for proper formatting</p>
        </div>
      </CardContent>
    </Card>
  )
}
