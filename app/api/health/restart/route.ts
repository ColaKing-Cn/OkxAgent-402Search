import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST() {
  return NextResponse.json(
    {
      restarted: false,
      reason: "disabled_in_web_build",
      error: "Remote restart via ssh2 has been disabled in this build. Move it to a standalone Node service if needed.",
    },
    { status: 501 }
  )
}
