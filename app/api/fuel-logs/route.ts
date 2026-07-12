import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { fuelLogSchema } from "@/lib/validations/fuelLog";

export async function GET() {
  try {
    await requireRole(["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]);
    
    const logs = await prisma.fuelLog.findMany({
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
    return NextResponse.json({ error: "Failed to fetch fuel logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(["FLEET_MANAGER", "DISPATCHER"]);
    
    const body = await req.json();
    const validated = fuelLogSchema.parse(body);

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: validated.vehicleId }
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: validated.vehicleId,
        liters: validated.liters,
        cost: validated.cost,
        date: validated.date,
        tripId: null, // explicitly ad-hoc
      }
    });

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
