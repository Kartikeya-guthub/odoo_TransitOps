"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaintenanceLog, Vehicle } from "@prisma/client";
import { useSession } from "next-auth/react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Wrench } from "lucide-react";
import { MaintenanceFormDialog } from "@/components/maintenance/maintenance-form-dialog";

type LogWithVehicle = MaintenanceLog & {
  vehicle: Vehicle;
};

export default function MaintenancePage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "FLEET_MANAGER";
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useQuery<LogWithVehicle[]>({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const res = await fetch("/api/maintenance");
      if (!res.ok) throw new Error("Failed to fetch maintenance logs");
      return res.json();
    }
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/maintenance/${id}/close`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close log");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles", "available"] });
    },
    onError: (error: any) => {
      alert(error.message); // simple alert for now
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100";
      case "CLOSED": return "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track vehicle repairs and operational downtime.
          </p>
        </div>
        {isManager && <MaintenanceFormDialog />}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  No maintenance logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log) => (
                <TableRow key={log.id} className="group transition-colors">
                  <TableCell>
                    <div className="font-medium">{log.vehicle.regNumber}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{log.vehicle.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium max-w-xs truncate" title={log.description}>{log.description}</div>
                  </TableCell>
                  <TableCell>
                    {new Date(log.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ${log.cost}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant="outline" className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Vehicle: {log.vehicle.status.replace("_", " ")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {log.status === "ACTIVE" && isManager && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => closeMutation.mutate(log.id)}
                        disabled={closeMutation.isPending}
                        className="h-8"
                      >
                        {closeMutation.isPending && closeMutation.variables === log.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Close"
                        )}
                      </Button>
                    )}
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
