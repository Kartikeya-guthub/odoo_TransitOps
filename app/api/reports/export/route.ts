import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { computeVehicleMetrics } from "@/lib/reports/computeVehicleMetrics";

export async function GET(req: Request) {
  try {
    await requireRole(["FLEET_MANAGER", "FINANCIAL_ANALYST"]);
    
    const vehicles = await prisma.vehicle.findMany({
      include: {
        trips: {
          where: { status: "COMPLETED" },
        },
        fuelLogs: true,
        maintenanceLogs: true,
      },
      orderBy: { regNumber: "asc" },
    });

    const report = vehicles.map(v => computeVehicleMetrics(v));

    // Convert to CSV
    const headers = ["Registration", "Name", "Fuel Efficiency (km/L)", "Operational Cost ($)", "Revenue ($)", "ROI"];
    const rows = report.map(r => [
      r.regNumber,
      `"${r.name}"`,
      r.fuelEfficiency !== null ? r.fuelEfficiency.toFixed(2) : "N/A",
      r.operationalCost.toFixed(2),
      r.revenue.toFixed(2),
      r.roi.toFixed(4)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="transitops-report.csv"`,
      },
    });

  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
