"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import type { ResumeData } from "@/types/resume"
import { LogIn } from "lucide-react"
import { signIn, useSession } from "next-auth/react"

interface LoadResumeProps {
  onResumeLoaded: (data: ResumeData) => void
  setIsLoading: (loading: boolean) => void
}

export default function LoadResume({ onResumeLoaded, setIsLoading }: LoadResumeProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const email = session?.user?.email

  const loadResume = async () => {
    if (!email) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resume/${encodeURIComponent(email)}`,
      )

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
          description: "No saved resume found for your account yet.",
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
        {email ? (
          <>
            <p className="text-sm text-muted-foreground">
              Load the resume saved to your account ({email}).
            </p>
            <Button onClick={loadResume} className="w-full">
              Load My Resume
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Sign in to load a resume you previously saved to your account.
            </p>
            <Button onClick={() => signIn("google")} variant="outline" className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
