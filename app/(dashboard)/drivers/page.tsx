"use client";

import { useQuery } from "@tanstack/react-query";
import { DriverProfile } from "@prisma/client";
import { useSession } from "next-auth/react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DriverFormDialog } from "@/components/drivers/driver-form-dialog";
import { DriverStatusDialog } from "@/components/drivers/driver-status-dialog";
import { DriverDeleteDialog } from "@/components/drivers/driver-delete-dialog";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { isDriverEligible } from "@/lib/derived/driverEligibility";

export default function DriversPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "FLEET_MANAGER";
  const isSafety = session?.user?.role === "SAFETY_OFFICER";
  const showActions = isManager || isSafety;

  const { data: drivers, isLoading } = useQuery<DriverProfile[]>({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await fetch("/api/drivers");
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return res.json();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20";
      case "ON_TRIP": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "OFF_DUTY": return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
      case "SUSPENDED": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 75) return "text-amber-600";
    return "text-destructive font-semibold";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Driver Profiles</h1>
          <p className="text-muted-foreground mt-2">
            Manage personnel, track safety scores, and monitor compliance.
          </p>
        </div>
        {isManager && <DriverFormDialog />}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Safety Score</TableHead>
              <TableHead>Eligibility</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={showActions ? 7 : 6} className="h-48 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : drivers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActions ? 7 : 6} className="h-48 text-center text-muted-foreground">
                  No drivers found.
                </TableCell>
              </TableRow>
            ) : (
              drivers?.map((driver) => {
                const eligible = isDriverEligible(driver);
                return (
                  <TableRow key={driver.id} className="group transition-colors">
                    <TableCell className="font-medium">
                      {driver.name}
                      <div className="text-xs text-muted-foreground font-normal mt-0.5">{driver.contactNumber}</div>
                    </TableCell>
                    <TableCell>
                      {driver.licenseNumber}
                      <div className="text-xs text-muted-foreground mt-0.5">{driver.licenseCategory}</div>
                    </TableCell>
                    <TableCell>{new Date(driver.licenseExpiryDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(driver.status)}>
                        {driver.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={getScoreColor(driver.safetyScore)}>
                        {driver.safetyScore}/100
                      </span>
                    </TableCell>
                    <TableCell>
                      {eligible ? (
                        <div className="flex items-center text-emerald-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Eligible
                        </div>
                      ) : (
                        <div className="flex items-center text-destructive text-sm font-medium">
                          <AlertTriangle className="w-4 h-4 mr-1.5" /> Ineligible
                        </div>
                      )}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isManager && <DriverFormDialog driver={driver} />}
                          {isSafety && <DriverStatusDialog driver={driver} />}
                          {isManager && <DriverDeleteDialog driver={driver} />}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
