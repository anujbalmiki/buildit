const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

export interface ShareState {
  token: string | null
  enabled: boolean
}

/** Build the public URL a visitor opens, from a share token. */
export function shareUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/r/${token}`
}

export async function getShareState(email: string): Promise<ShareState> {
  const res = await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}/share`)
  if (!res.ok) throw new Error("Failed to load sharing state")
  return res.json()
}

export async function enableShare(email: string): Promise<ShareState> {
  const res = await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}/share`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to enable sharing")
  return res.json()
}

export async function disableShare(email: string): Promise<ShareState> {
  const res = await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}/share/disable`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to disable sharing")
  return res.json()
}

export async function regenerateShare(email: string): Promise<ShareState> {
  const res = await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}/share/regenerate`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to regenerate the link")
  return res.json()
}

/** Fetch a public resume by token (used by the /r/[token] page). */
export async function getPublicResume(token: string) {
  const res = await fetch(`${BACKEND}/api/r/${encodeURIComponent(token)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to load shared resume")
  return res.json()
}
