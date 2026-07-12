import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    // All roles can access the dashboard, the UI will scope what they see
    await requireRole(["FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const region = searchParams.get("region");

    const vehicleWhere: any = {};
    if (type && type !== "all") vehicleWhere.type = type;
    if (status && status !== "all") vehicleWhere.status = status;
    if (region && region !== "all") vehicleWhere.region = region;

    const [
      totalVehicles,
      retiredVehicles,
      availableVehicles,
      vehiclesInMaintenance,
      onTripVehicles,
      activeTrips,
      pendingTrips,
      completedTrips,
      cancelledTrips,
      driversOnDuty,
    ] = await Promise.all([
      prisma.vehicle.count({ where: vehicleWhere }),
      prisma.vehicle.count({ where: { ...vehicleWhere, status: "RETIRED" } }),
      prisma.vehicle.count({ where: { ...vehicleWhere, status: "AVAILABLE" } }),
      prisma.vehicle.count({ where: { ...vehicleWhere, status: "IN_SHOP" } }),
      prisma.vehicle.count({ where: { ...vehicleWhere, status: "ON_TRIP" } }),
      prisma.trip.count({ where: { status: "DISPATCHED" } }),
      prisma.trip.count({ where: { status: "DRAFT" } }),
      prisma.trip.count({ where: { status: "COMPLETED" } }),
      prisma.trip.count({ where: { status: "CANCELLED" } }),
      prisma.driverProfile.count({ where: { status: "ON_TRIP" } }),
    ]);

    const activeFleetSize = totalVehicles - retiredVehicles;
    const fleetUtilization = activeFleetSize > 0 
      ? (onTripVehicles / activeFleetSize) * 100 
      : 0;

    return NextResponse.json({
      activeVehicles: activeFleetSize,
      availableVehicles,
      vehiclesInMaintenance,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilization,
      statusDistribution: {
        vehicles: {
          available: availableVehicles,
          onTrip: onTripVehicles,
          inShop: vehiclesInMaintenance,
          retired: retiredVehicles
        },
        trips: {
          draft: pendingTrips,
          dispatched: activeTrips,
          completed: completedTrips,
          cancelled: cancelledTrips
        }
      }
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
