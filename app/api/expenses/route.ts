import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { expenseSchema } from "@/lib/validations/expense";

export async function GET() {
  try {
    await requireRole(["FLEET_MANAGER", "DRIVER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]);
    
    const expenses = await prisma.expense.findMany({
      include: {
        vehicle: true,
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(["FLEET_MANAGER", "DRIVER"]);
    
    const body = await req.json();
    const validated = expenseSchema.parse(body);

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: validated.vehicleId }
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const expense = await prisma.expense.create({
      data: {
        vehicleId: validated.vehicleId,
        type: validated.type,
        amount: validated.amount,
        date: validated.date,
      }
    });

    return NextResponse.json(expense, { status: 201 });
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
