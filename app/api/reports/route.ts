import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { computeVehicleMetrics, ComputedMetrics } from "@/lib/reports/computeVehicleMetrics";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["FLEET_MANAGER", "FINANCIAL_ANALYST"]);
    
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");
    
    // We could add date filtering later, for now we pull all history
    const where: any = {};
    if (vehicleId) where.id = vehicleId;

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        trips: {
          where: { status: "COMPLETED" },
        },
        fuelLogs: true,
        maintenanceLogs: true,
      },
      orderBy: { regNumber: "asc" },
    });

    const report: ComputedMetrics[] = vehicles.map(v => computeVehicleMetrics(v));

    return NextResponse.json(report);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
