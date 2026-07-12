"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Truck, Activity, Wrench, Navigation, CheckSquare, Users, Percent, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

type DashboardData = {
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
  statusDistribution: {
    vehicles: { available: number; onTrip: number; inShop: number; retired: number };
    trips: { draft: number; dispatched: number; completed: number; cancelled: number };
  };
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [region, setRegion] = useState("all");

  const queryParams = new URLSearchParams();
  if (type !== "all") queryParams.append("type", type);
  if (status !== "all") queryParams.append("status", status);
  if (region !== "all") queryParams.append("region", region);

  const { data: kpis, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard", type, status, region],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    }
  });

  const showFinancial = role === "FLEET_MANAGER" || role === "FINANCIAL_ANALYST";
  const showDispatch = role === "FLEET_MANAGER" || role === "DISPATCHER";
  const showSafety = role === "FLEET_MANAGER" || role === "SAFETY_OFFICER" || role === "DISPATCHER";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          At-a-glance operations overview and KPIs.
        </p>
      </div>

      <div className="p-4 bg-muted/30 border rounded-xl flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Vehicle Type</Label>
          <Select value={type} onValueChange={(val) => setType(val || "all")}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Heavy Truck">Heavy Truck</SelectItem>
              <SelectItem value="Cargo Van">Cargo Van</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Region</Label>
          <Select value={region} onValueChange={(val) => setRegion(val || "all")}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="North">North</SelectItem>
              <SelectItem value="South">South</SelectItem>
              <SelectItem value="East">East</SelectItem>
              <SelectItem value="West">West</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          
          {(showFinancial || showDispatch) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Fleet</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis?.activeVehicles || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Excludes retired vehicles</p>
              </CardContent>
            </Card>
          )}

          {showDispatch && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Vehicles</CardTitle>
                <CheckSquare className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{kpis?.availableVehicles || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Ready for dispatch</p>
              </CardContent>
            </Card>
          )}

          {(showDispatch || showFinancial) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
                <Wrench className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">{kpis?.vehiclesInMaintenance || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Currently in shop</p>
              </CardContent>
            </Card>
          )}

          {showDispatch && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
                <Navigation className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{kpis?.activeTrips || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Currently en route</p>
              </CardContent>
            </Card>
          )}

          {showDispatch && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Trips</CardTitle>
                <Activity className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">{kpis?.pendingTrips || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Drafts awaiting dispatch</p>
              </CardContent>
            </Card>
          )}

          {showSafety && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Drivers On Duty</CardTitle>
                <Users className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-700">{kpis?.driversOnDuty || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Active on trips</p>
              </CardContent>
            </Card>
          )}

          {showFinancial && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fleet Utilization</CardTitle>
                <Percent className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">
                  {kpis?.fleetUtilization ? kpis.fleetUtilization.toFixed(1) : "0.0"}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active vs On Trip</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts Section */}
      {!isLoading && kpis?.statusDistribution && (
        <div className="grid gap-4 md:grid-cols-2">
          {showDispatch && (
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Available", value: kpis.statusDistribution.vehicles.available, fill: "#10b981" },
                        { name: "On Trip", value: kpis.statusDistribution.vehicles.onTrip, fill: "#3b82f6" },
                        { name: "In Shop", value: kpis.statusDistribution.vehicles.inShop, fill: "#f59e0b" },
                        { name: "Retired", value: kpis.statusDistribution.vehicles.retired, fill: "#64748b" },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[
                        { name: "Available", value: kpis.statusDistribution.vehicles.available, fill: "#10b981" },
                        { name: "On Trip", value: kpis.statusDistribution.vehicles.onTrip, fill: "#3b82f6" },
                        { name: "In Shop", value: kpis.statusDistribution.vehicles.inShop, fill: "#f59e0b" },
                        { name: "Retired", value: kpis.statusDistribution.vehicles.retired, fill: "#64748b" },
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-v-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {showDispatch && (
            <Card>
              <CardHeader>
                <CardTitle>Trip Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Draft", value: kpis.statusDistribution.trips.draft, fill: "#f59e0b" },
                        { name: "Dispatched", value: kpis.statusDistribution.trips.dispatched, fill: "#3b82f6" },
                        { name: "Completed", value: kpis.statusDistribution.trips.completed, fill: "#10b981" },
                        { name: "Cancelled", value: kpis.statusDistribution.trips.cancelled, fill: "#ef4444" },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[
                        { name: "Draft", value: kpis.statusDistribution.trips.draft, fill: "#f59e0b" },
                        { name: "Dispatched", value: kpis.statusDistribution.trips.dispatched, fill: "#3b82f6" },
                        { name: "Completed", value: kpis.statusDistribution.trips.completed, fill: "#10b981" },
                        { name: "Cancelled", value: kpis.statusDistribution.trips.cancelled, fill: "#ef4444" },
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-t-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
