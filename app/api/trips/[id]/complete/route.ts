import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["FLEET_MANAGER", "DRIVER"]);
    
    // 1. Fetch trip by ID
    const trip = await prisma.trip.findUnique({
      where: { id: params.id },
      include: {
        vehicle: true,
      }
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (trip.status !== "DISPATCHED") {
      return NextResponse.json({ error: `Cannot complete trip in ${trip.status} status. Trip must be DISPATCHED.` }, { status: 409 });
    }

    const body = await req.json();
    const { finalOdometer, fuelConsumed, fuelCost, revenue } = body;

    // 2. Validate payload
    if (typeof finalOdometer !== 'number' || finalOdometer < trip.vehicle.odometer) {
      return NextResponse.json({ 
        error: `Final odometer (${finalOdometer} km) cannot be less than current vehicle odometer (${trip.vehicle.odometer} km).` 
      }, { status: 400 });
    }

    if (typeof fuelConsumed !== 'number' || fuelConsumed < 0) {
      return NextResponse.json({ error: "Fuel consumed must be a positive number." }, { status: 400 });
    }

    if (typeof revenue !== 'number' || revenue < 0) {
      return NextResponse.json({ error: "Revenue must be a positive number." }, { status: 400 });
    }

    // 3. Compute actualDistance
    const actualDistance = finalOdometer - trip.vehicle.odometer;

    // 4. Single DB transaction ($transaction) to update all three entities atomically
    const [updatedTrip] = await prisma.$transaction([
      prisma.trip.update({
        where: { id: trip.id },
        data: {
          status: "COMPLETED",
          actualDistance,
          revenue,
          completedAt: new Date(),
        }
      }),
      prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: "AVAILABLE",
          odometer: finalOdometer,
        }
      }),
      prisma.driverProfile.update({
        where: { id: trip.driverId },
        data: {
          status: "AVAILABLE",
        }
      }),
      prisma.fuelLog.create({
        data: {
          vehicleId: trip.vehicleId,
          tripId: trip.id,
          liters: fuelConsumed,
          cost: fuelCost || 0,
          date: new Date(),
        }
      })
    ]);

    return NextResponse.json(updatedTrip, { status: 200 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
