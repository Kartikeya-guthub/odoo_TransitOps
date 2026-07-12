import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole, requireFieldScope } from "@/lib/rbac";
import { driverSchema, driverStatusSchema } from "@/lib/validations/driver";
import prisma from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const driver = await prisma.driverProfile.findUnique({
    where: { id: params.id },
  });
  if (!driver) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  return NextResponse.json(driver);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  try {
    requireRole(session, ["FLEET_MANAGER", "SAFETY_OFFICER"]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  try {
    const json = await req.json();
    
    // Check if the current user has restricted field access
    requireFieldScope(session, json, {
      SAFETY_OFFICER: ["status", "safetyScore"],
    });

    // Validate the incoming fields.
    // If it's a SAFETY_OFFICER, they are only submitting status and safetyScore.
    let body;
    if (session?.user?.role === "SAFETY_OFFICER") {
      body = driverStatusSchema.parse(json);
    } else {
      // It's a FLEET_MANAGER or another unrestricted role.
      // We parse as partial so they can update subset of fields.
      body = driverSchema.partial().parse(json);
    }

    const driver = await prisma.driverProfile.update({
      where: { id: params.id },
      data: body as Prisma.DriverProfileUpdateInput,
    });

    return NextResponse.json(driver);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("403")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  try {
    requireRole(session, ["FLEET_MANAGER"]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  try {
    await prisma.driverProfile.delete({
      where: { id: params.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2003") {
      return NextResponse.json({ error: "Driver has trip history, cannot delete" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
