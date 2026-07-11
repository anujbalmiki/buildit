import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the host header. Required for self-hosted / `next start` and non-Vercel
  // deploys (Vercel sets this automatically). Safe here — we control the host.
  trustHost: true,
  providers: [Google],
})
