import type { ResumeData } from "@/types/resume"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

export type VersionSource = "manual" | "pre-load" | "auto" | "ai"

export interface VersionMeta {
  id: string
  source: VersionSource | string
  protected: boolean
  created_at: string | null
}

export interface VersionDetail extends VersionMeta {
  snapshot: ResumeData
}

/** Store a point-in-time copy of the resume. Fire-and-forget friendly:
 *  swallows network errors so version-keeping never blocks the user. */
export async function createVersion(
  email: string,
  snapshot: ResumeData,
  source: VersionSource,
  isProtected: boolean,
): Promise<void> {
  try {
    await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot, source, protected: isProtected }),
    })
  } catch {
    /* history is best-effort; ignore */
  }
}

export async function listVersions(email: string): Promise<VersionMeta[]> {
  const res = await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}/versions`)
  if (!res.ok) throw new Error("Failed to load version history")
  return res.json()
}

export async function getVersion(email: string, id: string): Promise<VersionDetail> {
  const res = await fetch(`${BACKEND}/api/resume/${encodeURIComponent(email)}/versions/${id}`)
  if (!res.ok) throw new Error("Failed to load version")
  return res.json()
}
