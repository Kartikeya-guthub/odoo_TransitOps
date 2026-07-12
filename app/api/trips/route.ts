import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tripSchema } from "@/lib/validations/trip";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await requireRole(["FLEET_MANAGER", "DRIVER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]);
    
    // Fetch all trips. Include relations.
    const trips = await prisma.trip.findMany({
      include: {
        vehicle: true,
        driver: true,
        createdBy: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(trips);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Only Fleet Manager and Driver can create a Draft trip.
    const session = await requireRole(["FLEET_MANAGER", "DRIVER"]);
    
    const body = await req.json();
    const validated = tripSchema.parse(body);

    // Fetch the vehicle to validate maxLoadCapacity server-side
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: validated.vehicleId }
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Selected vehicle not found" }, { status: 404 });
    }

    if (vehicle.status !== "AVAILABLE") {
      return NextResponse.json({ error: "Selected vehicle is not available" }, { status: 400 });
    }

    if (validated.cargoWeight > vehicle.maxLoadCapacity) {
      return NextResponse.json(
        { error: `Cargo weight (${validated.cargoWeight} kg) exceeds vehicle max capacity (${vehicle.maxLoadCapacity} kg)` },
        { status: 400 }
      );
    }

    // Double check driver eligibility
    const driver = await prisma.driverProfile.findUnique({
      where: { id: validated.driverId }
    });

    if (!driver) {
      return NextResponse.json({ error: "Selected driver not found" }, { status: 404 });
    }

    if (driver.status !== "AVAILABLE" || driver.licenseExpiryDate < new Date()) {
      return NextResponse.json({ error: "Selected driver is not eligible" }, { status: 400 });
    }

    // Insert Trip row as DRAFT.
    // Note: Per requirements, creating a Draft does NOT lock vehicle or driver status.
    const trip = await prisma.trip.create({
      data: {
        source: validated.source,
        destination: validated.destination,
        vehicleId: validated.vehicleId,
        driverId: validated.driverId,
        cargoWeight: validated.cargoWeight,
        plannedDistance: validated.plannedDistance,
        status: "DRAFT",
        createdById: session.user.id,
      }
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
