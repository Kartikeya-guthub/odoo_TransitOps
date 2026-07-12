import { Session } from "next-auth"
import { Role } from "@prisma/client"

export function requireRole(session: Session | null, allowedRoles: Role[]) {
  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    throw new Error("403 Forbidden")
  }
}

export function requireFieldScope(
  session: Session | null,
  payload: Record<string, unknown>,
  allowedFieldsForRole: Partial<Record<Role, string[]>>
) {
  if (!session?.user?.role) throw new Error("403 Forbidden")
  
  const role = session.user.role
  const allowedFields = allowedFieldsForRole[role]

  // If the role is listed in the map, restrict them to those fields
  if (allowedFields) {
    const requestedFields = Object.keys(payload)
    const unauthorizedFields = requestedFields.filter(f => !allowedFields.includes(f))
    
    if (unauthorizedFields.length > 0) {
      throw new Error(`403 Forbidden: Field(s) [${unauthorizedFields.join(", ")}] not allowed for role ${role}`)
    }
  }
}
