"use client";

import { useQuery } from "@tanstack/react-query";
import { Trip, Vehicle, DriverProfile, User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TripFormDialog } from "@/components/trips/trip-form-dialog";
import { Loader2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

type TripWithRelations = Trip & {
  vehicle: Vehicle;
  driver: DriverProfile;
  createdBy: { email: string };
};

export default function TripsPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "FLEET_MANAGER";
  const isDriver = session?.user?.role === "DISPATCHER";
  const canCreate = isManager || isDriver;

  const { data: trips, isLoading } = useQuery<TripWithRelations[]>({
    queryKey: ["trips"],
    queryFn: async () => {
      const res = await fetch("/api/trips");
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200";
      case "DISPATCHED": return "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100";
      case "COMPLETED": return "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100";
      case "CANCELLED": return "bg-red-50 text-red-600 border-red-200 hover:bg-red-100";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trips</h1>
          <p className="text-muted-foreground mt-2">
            Manage trips, dispatch vehicles, and track active deliveries.
          </p>
        </div>
        {canCreate && <TripFormDialog />}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cargo Weight</TableHead>
              <TableHead className="text-right">Distance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : trips?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                  No trips found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              trips?.map((trip) => (
                <TableRow key={trip.id} className="group transition-colors hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/trips/${trip.id}`}>
                  <TableCell>
                    <div className="font-medium">{trip.source}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">to {trip.destination}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{trip.vehicle.regNumber}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{trip.vehicle.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{trip.driver.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{trip.driver.licenseCategory}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(trip.status)}>
                      {trip.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {trip.cargoWeight} kg
                  </TableCell>
                  <TableCell className="text-right">
                    {trip.plannedDistance} km
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/trips/${trip.id}`}>View</a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
