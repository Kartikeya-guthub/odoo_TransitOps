import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(["FLEET_MANAGER", "DISPATCHER"]);
    
    // 1. Fetch trip by ID
    const trip = await prisma.trip.findUnique({
      where: { id: params.id },
      include: {
        vehicle: true,
        driver: true
      }
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (trip.status !== "DRAFT") {
      return NextResponse.json({ error: `Cannot dispatch trip in ${trip.status} status. Trip must be in DRAFT.` }, { status: 409 });
    }

    // 2. RE-VALIDATE availability
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (trip.vehicle.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: `Vehicle ${trip.vehicle.regNumber} is no longer available — now ${trip.vehicle.status.replace("_", " ")}` },
        { status: 400 }
      );
    }

    if (trip.driver.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: `Driver ${trip.driver.name} is no longer available — now ${trip.driver.status.replace("_", " ")}` },
        { status: 400 }
      );
    }

    if (new Date(trip.driver.licenseExpiryDate) < today) {
      return NextResponse.json(
        { error: `Driver ${trip.driver.name}'s license has expired` },
        { status: 400 }
      );
    }

    // 3. Single DB transaction ($transaction) to update all three entities atomically
    const [updatedTrip, updatedVehicle, updatedDriver] = await prisma.$transaction([
      prisma.trip.update({
        where: { id: trip.id },
        data: {
          status: "DISPATCHED",
          dispatchedAt: new Date(),
        }
      }),
      prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: "ON_TRIP",
        }
      }),
      prisma.driverProfile.update({
        where: { id: trip.driverId },
        data: {
          status: "ON_TRIP",
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
