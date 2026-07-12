import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["FLEET_MANAGER"]);
    
    // 1. Fetch MaintenanceLog
    const log = await prisma.maintenanceLog.findUnique({
      where: { id: params.id }
    });

    if (!log) {
      return NextResponse.json({ error: "Maintenance log not found" }, { status: 404 });
    }

    if (log.status !== "ACTIVE") {
      return NextResponse.json({ error: `Cannot close a maintenance log that is already ${log.status}` }, { status: 409 });
    }

    // 2. Fetch current Vehicle status FRESH
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: log.vehicleId }
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Associated vehicle not found" }, { status: 404 });
    }

    // 3. Transaction
    // Only revert vehicle to AVAILABLE if it is currently IN_SHOP (respects RETIRED status)
    const newVehicleStatus = vehicle.status === "IN_SHOP" ? "AVAILABLE" : vehicle.status;

    const [updatedLog] = await prisma.$transaction([
      prisma.maintenanceLog.update({
        where: { id: log.id },
        data: {
          status: "CLOSED",
        }
      }),
      prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          status: newVehicleStatus,
        }
      })
    ]);

    return NextResponse.json(updatedLog, { status: 200 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
