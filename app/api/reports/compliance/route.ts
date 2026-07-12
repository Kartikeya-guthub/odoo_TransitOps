import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole(["SAFETY_OFFICER", "FLEET_MANAGER"]);
    
    const drivers = await prisma.driverProfile.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        licenseNumber: true,
        licenseExpiryDate: true,
        safetyScore: true,
        status: true,
      }
    });

    const now = new Date();
    
    // Add derived compliance flags
    const complianceData = drivers.map(d => {
      const isLicenseExpired = d.licenseExpiryDate < now;
      const isSuspended = d.status === "SUSPENDED";
      const isEligible = d.status === "AVAILABLE" && !isLicenseExpired;

      return {
        ...d,
        isLicenseExpired,
        isSuspended,
        isEligible,
      };
    });

    return NextResponse.json(complianceData);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to fetch compliance report" }, { status: 500 });
  }
}
