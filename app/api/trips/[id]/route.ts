import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["FLEET_MANAGER", "DRIVER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]);
    
    const trip = await prisma.trip.findUnique({
      where: { id: params.id },
      include: {
        vehicle: true,
        driver: true,
        createdBy: {
          select: { email: true, role: true }
        }
      }
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
  }
}
