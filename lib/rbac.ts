import { Session } from "next-auth"
import { Role } from "@prisma/client"

export function requireRole(session: Session | null, allowedRoles: Role[]) {
  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    // In API routes we can throw an error or handle it gracefully.
    // Throwing an error will cause a 500 in Next.js API unless caught,
    // but typically we can just return a Response in the API route.
    // For this helper, throwing a specific error string is easiest for now.
    throw new Error("403 Forbidden")
  }
}
