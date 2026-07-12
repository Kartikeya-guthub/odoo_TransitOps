"use client";

import { useQuery } from "@tanstack/react-query";
import { Vehicle } from "@prisma/client";
import { useSession } from "next-auth/react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VehicleFormDialog } from "@/components/vehicles/vehicle-form-dialog";
import { VehicleDeleteDialog } from "@/components/vehicles/vehicle-delete-dialog";
import { Loader2 } from "lucide-react";

export default function VehiclesPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "FLEET_MANAGER";

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20";
      case "ON_TRIP": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "IN_SHOP": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20";
      case "RETIRED": return "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground mt-2">
            Manage your fleet, track statuses, and monitor vehicle metrics.
          </p>
        </div>
        {isManager && <VehicleFormDialog />}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[150px]">Reg Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Region</TableHead>
              <TableHead className="text-right">Odometer</TableHead>
              {isManager && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isManager ? 7 : 6} className="h-48 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : vehicles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isManager ? 7 : 6} className="h-48 text-center text-muted-foreground">
                  No vehicles found.
                </TableCell>
              </TableRow>
            ) : (
              vehicles?.map((vehicle) => (
                <TableRow key={vehicle.id} className="group transition-colors">
                  <TableCell className="font-medium">{vehicle.regNumber}</TableCell>
                  <TableCell>{vehicle.name}</TableCell>
                  <TableCell className="text-muted-foreground">{vehicle.type}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusColor(vehicle.status)}>
                      {vehicle.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{vehicle.region}</TableCell>
                  <TableCell className="text-right">{vehicle.odometer.toLocaleString()} km</TableCell>
                  {isManager && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <VehicleFormDialog vehicle={vehicle} />
                        <VehicleDeleteDialog vehicle={vehicle} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
