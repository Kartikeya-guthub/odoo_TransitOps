import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["FLEET_MANAGER", "DISPATCHER"]);
    
    // 1. Fetch trip by ID
    const trip = await prisma.trip.findUnique({
      where: { id: params.id }
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (trip.status !== "DISPATCHED") {
      return NextResponse.json({ error: `Cannot cancel trip in ${trip.status} status. Trip must be DISPATCHED.` }, { status: 409 });
    }

    // 2. Single DB transaction ($transaction) to update all three entities atomically
    const [updatedTrip] = await prisma.$transaction([
      prisma.trip.update({
        where: { id: trip.id },
        data: {
          status: "CANCELLED",
        }
      }),
      prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: "AVAILABLE",
        }
      }),
      prisma.driverProfile.update({
        where: { id: trip.driverId },
        data: {
          status: "AVAILABLE",
        }
      }),
    ]);

    return NextResponse.json(updatedTrip, { status: 200 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
