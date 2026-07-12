"use client";

import { useQuery } from "@tanstack/react-query";
import { FuelLog, Expense, Vehicle } from "@prisma/client";
import { useSession } from "next-auth/react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FuelFormDialog } from "@/components/finances/fuel-form-dialog";
import { ExpenseFormDialog } from "@/components/finances/expense-form-dialog";

type FuelLogWithVehicle = FuelLog & { vehicle: Vehicle };
type ExpenseWithVehicle = Expense & { vehicle: Vehicle };

export default function FinancesPage() {
  const { data: session } = useSession();
  const isManagerOrDriver = session?.user?.role === "FLEET_MANAGER" || session?.user?.role === "DISPATCHER";

  const { data: fuelLogs, isLoading: fuelLoading } = useQuery<FuelLogWithVehicle[]>({
    queryKey: ["fuel-logs"],
    queryFn: async () => {
      const res = await fetch("/api/fuel-logs");
      if (!res.ok) throw new Error("Failed to fetch fuel logs");
      return res.json();
    }
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<ExpenseWithVehicle[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    }
  });

  const getExpenseTypeColor = (type: string) => {
    switch (type) {
      case "TOLL": return "bg-amber-50 text-amber-600 border-amber-200";
      case "MAINTENANCE": return "bg-orange-50 text-orange-600 border-orange-200";
      case "MISC": return "bg-purple-50 text-purple-600 border-purple-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fuel & Expenses</h1>
          <p className="text-muted-foreground mt-2">
            Track operational costs across your fleet.
          </p>
        </div>
        {isManagerOrDriver && (
          <div className="flex gap-2">
            <FuelFormDialog />
            <ExpenseFormDialog />
          </div>
        )}
      </div>

      <Tabs defaultValue="fuel" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="fuel">Fuel Logs</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="fuel" className="mt-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Liters</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : fuelLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                      No fuel logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  fuelLogs?.map((log) => (
                    <TableRow key={log.id} className="group transition-colors">
                      <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="font-medium">{log.vehicle.regNumber}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{log.vehicle.name}</div>
                      </TableCell>
                      <TableCell className="text-right">{log.liters.toFixed(1)} L</TableCell>
                      <TableCell className="text-right font-medium">${log.cost.toFixed(2)}</TableCell>
                      <TableCell>
                        {log.tripId ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                            <LinkIcon className="h-3 w-3 mr-1" /> Trip Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">
                            Ad-hoc
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : expenses?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                      No expenses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses?.map((exp) => (
                    <TableRow key={exp.id} className="group transition-colors">
                      <TableCell>{new Date(exp.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="font-medium">{exp.vehicle.regNumber}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{exp.vehicle.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getExpenseTypeColor(exp.type)}>
                          {exp.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">${exp.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
