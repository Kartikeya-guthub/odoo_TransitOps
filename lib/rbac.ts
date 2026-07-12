import { Session, getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { Role } from "@prisma/client"

export async function requireRole(
  sessionOrRoles: Session | null | Role[],
  allowedRoles?: Role[]
): Promise<Session> {
  let session: Session | null = null;
  let roles: Role[] = [];

  if (Array.isArray(sessionOrRoles)) {
    session = await getServerSession(authOptions);
    roles = sessionOrRoles;
  } else {
    session = sessionOrRoles;
    roles = allowedRoles || [];
  }

  if (!session?.user?.role || !roles.includes(session.user.role)) {
    if (!session) throw new Error("401 Unauthorized");
    throw new Error("403 Forbidden");
  }
  return session;
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
