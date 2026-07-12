import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["FLEET_MANAGER"]);
    
    // 1. Fetch vehicle by ID
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id }
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (vehicle.status === "ON_TRIP") {
      return NextResponse.json({ error: "Cannot retire a vehicle that is currently on a trip." }, { status: 400 });
    }

    if (vehicle.status === "RETIRED") {
      return NextResponse.json({ error: "Vehicle is already retired." }, { status: 409 });
    }

    // 2. Update status
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        status: "RETIRED",
      }
    });

    return NextResponse.json(updatedVehicle, { status: 200 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
