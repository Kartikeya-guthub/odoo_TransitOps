import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requireRole } from "@/lib/rbac"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  try {
    requireRole(session, ["FLEET_MANAGER"])
    return NextResponse.json({ success: true, message: "Welcome Fleet Manager!" })
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 403 })
  }
}
