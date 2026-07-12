import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole(["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]);
    
    // Returns drivers WHERE status = 'AVAILABLE' AND licenseExpiryDate >= today
    // (reuses isDriverEligible() logic from Phase 4, applied as a filter at the query level)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const drivers = await prisma.driverProfile.findMany({
      where: {
        status: "AVAILABLE",
        licenseExpiryDate: {
          gte: today,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(drivers);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to fetch available drivers" }, { status: 500 });
  }
}
