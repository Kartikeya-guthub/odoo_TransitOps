import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { driverSchema } from "@/lib/validations/driver";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const licenseExpiring = searchParams.get("licenseExpiring") === "true";

  const where: Prisma.DriverProfileWhereInput = {};
  if (status) {
    where.status = status as Prisma.EnumDriverStatusFilter;
  }
  if (licenseExpiring) {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    where.licenseExpiryDate = {
      lte: nextMonth,
    };
  }

  const drivers = await prisma.driverProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  try {
    await requireRole(session, ["FLEET_MANAGER"]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  try {
    const json = await req.json();
    const body = driverSchema.parse(json);

    const driver = await prisma.driverProfile.create({
      data: {
        ...body,
        status: "AVAILABLE",
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
