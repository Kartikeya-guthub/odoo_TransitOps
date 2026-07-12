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
import { Loader2, ArrowUpDown } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

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
      case "AVAILABLE": return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900";
      case "ON_TRIP": return "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900";
      case "SUSPENDED": return "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900";
      case "TERMINATED": return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      default: return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const columns: ColumnDef<DriverProfile>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium px-4">{row.original.name}</div>,
    },
    {
      accessorKey: "licenseNumber",
      header: "License Number",
    },
    {
      accessorKey: "licenseExpiryDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          License Expiry <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.licenseExpiryDate);
        return <div>{date.toLocaleDateString()}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant="outline" className={getStatusColor(status)}>
            {status.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "safetyScore",
      header: ({ column }) => (
        <div className="text-right">
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Safety Score <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const score = row.original.safetyScore;
        return (
          <div className={`text-right font-medium pr-4 ${getScoreColor(score)}`}>
            {score}/100
          </div>
        );
      },
    },
    ...(showActions ? [{
      id: "actions",
      cell: ({ row }) => {
        const driver = row.original;
        return (
          <div className="flex justify-end pr-4 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isManager && <DriverFormDialog driver={driver} />}
            {isSafety && <DriverStatusDialog driver={driver} />}
            {isManager && <DriverDeleteDialog driver={driver} />}
          </div>
        );
      },
    }] as ColumnDef<DriverProfile>[] : []),
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
          <p className="text-muted-foreground mt-2">
            Manage driver profiles, licenses, and safety scores.
          </p>
        </div>
        {isManager && <DriverFormDialog />}
      </div>

      <div className="bg-card text-card-foreground shadow-sm">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center border rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={drivers || []} 
            searchKey="name" 
            searchPlaceholder="Search Drivers..." 
          />
        )}
      </div>
      
      {isManager && (
        <div className="flex justify-end pt-4 border-t">
          <Button 
            variant="secondary" 
            onClick={async () => {
              const res = await fetch("/api/cron/license-reminders?manual=true");
              const data = await res.json();
              if (res.ok) alert(`Reminder check complete. ${data.count} driver(s) expiring soon. Email mocked: ${data.mocked}`);
              else alert(`Error: ${data.error}`);
            }}
          >
            Trigger Reminder Check
          </Button>
        </div>
      )}
    </div>
  );
}
