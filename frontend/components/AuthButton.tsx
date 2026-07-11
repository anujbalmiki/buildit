"use client"

import { Button } from "@/components/ui/button"
import { LogIn, LogOut } from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"

export default function AuthButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {session.user.name || session.user.email}
        </span>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={() => signIn("google")}>
      <LogIn className="mr-2 h-4 w-4" />
      Sign in with Google
    </Button>
  )
}
