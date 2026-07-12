"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Vehicle } from "@prisma/client";
import { useSession } from "next-auth/react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VehicleFormDialog } from "@/components/vehicles/vehicle-form-dialog";
import { VehicleDeleteDialog } from "@/components/vehicles/vehicle-delete-dialog";
import { Loader2, ArchiveRestore } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export default function VehiclesPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "FLEET_MANAGER";
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    }
  });

  const retireMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vehicles/${id}/retire`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retire vehicle");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error: any) => {
      alert(error.message);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900";
      case "ON_TRIP": return "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900";
      case "IN_SHOP": return "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900";
      case "RETIRED": return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      default: return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    }
  };

  const columns: ColumnDef<Vehicle>[] = [
    {
      accessorKey: "regNumber",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Reg Number <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium px-4">{row.getValue("regNumber")}</div>,
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("type")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant="outline" className={getStatusColor(status)}>
            {status.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "region",
      header: "Region",
    },
    {
      accessorKey: "odometer",
      header: ({ column }) => (
        <div className="text-right">
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Odometer <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("odometer"));
        return <div className="text-right font-medium pr-4">{amount.toLocaleString()} km</div>;
      },
    },
    ...(isManager ? [{
      id: "actions",
      cell: ({ row }) => {
        const vehicle = row.original;
        return (
          <div className="flex justify-end gap-2 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <VehicleFormDialog vehicle={vehicle} />
            {vehicle.status !== "RETIRED" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" title="Retire Vehicle">
                    <ArchiveRestore className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retire Vehicle?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently mark the vehicle as RETIRED.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => retireMutation.mutate(vehicle.id)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Confirm Retirement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <VehicleDeleteDialog vehicle={vehicle} />
          </div>
        );
      },
    }] as ColumnDef<Vehicle>[] : []),
  ];

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

      <div className="bg-card text-card-foreground shadow-sm">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center border rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={vehicles || []} 
            searchKey="regNumber" 
            searchPlaceholder="Search Reg Number..." 
          />
        )}
      </div>
    </div>
  );
}
