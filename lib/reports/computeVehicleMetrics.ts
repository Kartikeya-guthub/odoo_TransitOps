import { Vehicle, Trip, FuelLog, MaintenanceLog } from "@prisma/client";

export type VehicleWithRelations = Vehicle & {
  trips: Trip[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
};

export type ComputedMetrics = {
  regNumber: string;
  name: string;
  fuelEfficiency: number | null; // N/A if no fuel logged
  operationalCost: number;
  revenue: number;
  roi: number;
};

export function computeVehicleMetrics(vehicle: VehicleWithRelations): ComputedMetrics {
  // Fuel Efficiency = sum(actualDistance of completed trips) / sum(fuel liters)
  const completedTrips = vehicle.trips.filter(t => t.status === "COMPLETED");
  
  const totalDistance = completedTrips.reduce((acc, trip) => {
    return acc + (trip.actualDistance || trip.plannedDistance || 0); 
  }, 0);

  const totalFuelLiters = vehicle.fuelLogs.reduce((acc, log) => acc + log.liters, 0);
  
  const fuelEfficiency = totalFuelLiters > 0 
    ? totalDistance / totalFuelLiters 
    : null;

  // Operational Cost = sum(fuel cost) + sum(maintenance cost)
  const totalFuelCost = vehicle.fuelLogs.reduce((acc, log) => acc + log.cost, 0);
  const totalMaintenanceCost = vehicle.maintenanceLogs.reduce((acc, log) => acc + log.cost, 0);
  const operationalCost = totalFuelCost + totalMaintenanceCost;

  // Revenue = sum(revenue of COMPLETED trips)
  const revenue = completedTrips.reduce((acc, trip) => acc + (trip.revenue || 0), 0);

  // ROI = (Revenue - Operational Cost) / Acquisition Cost
  const acquisitionCost = vehicle.acquisitionCost > 0 ? vehicle.acquisitionCost : 1; // Guard divide by zero
  const roi = (revenue - operationalCost) / acquisitionCost;

  return {
    regNumber: vehicle.regNumber,
    name: vehicle.name,
    fuelEfficiency,
    operationalCost,
    revenue,
    roi,
  };
}
