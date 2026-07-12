import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole(["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]);
    
    // Returns vehicles WHERE status = 'AVAILABLE'
    const vehicles = await prisma.vehicle.findMany({
      where: {
        status: "AVAILABLE",
      },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(vehicles);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to fetch available vehicles" }, { status: 500 });
  }
}
