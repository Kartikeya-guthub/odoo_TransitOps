import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { maintenanceSchema } from "@/lib/validations/maintenance";

export async function GET() {
  try {
    await requireRole(["FLEET_MANAGER", "DRIVER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]);
    
    const logs = await prisma.maintenanceLog.findMany({
      include: {
        vehicle: true,
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(logs);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to fetch maintenance logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(["FLEET_MANAGER"]);
    
    const body = await req.json();
    const validated = maintenanceSchema.parse(body);

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: validated.vehicleId }
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Guards
    if (vehicle.status === "ON_TRIP") {
      return NextResponse.json(
        { error: "Vehicle is currently on a trip and cannot be sent to maintenance." },
        { status: 400 }
      );
    }
    if (vehicle.status === "RETIRED") {
      return NextResponse.json(
        { error: "Vehicle is retired and cannot be serviced." },
        { status: 400 }
      );
    }

    // Transaction
    const [log] = await prisma.$transaction([
      prisma.maintenanceLog.create({
        data: {
          vehicleId: validated.vehicleId,
          description: validated.description,
          cost: validated.cost,
          date: validated.date,
          status: "ACTIVE",
        }
      }),
      prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          status: "IN_SHOP",
        }
      })
    ]);

    return NextResponse.json(log, { status: 201 });
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
