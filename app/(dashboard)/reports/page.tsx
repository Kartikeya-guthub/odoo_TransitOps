"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, BarChart3, Receipt, Gauge, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ComputedMetrics } from "@/lib/reports/computeVehicleMetrics";

export default function ReportsPage() {
  const { data: metrics, isLoading, error } = useQuery<ComputedMetrics[]>({
    queryKey: ["reports"],
    queryFn: async () => {
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Failed to load reports");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Access Denied or Error</h2>
          <p className="text-muted-foreground">Unable to load financial reports.</p>
        </div>
      </div>
    );
  }

  const exportPDF = () => {
    if (!metrics) return;
    
    // Dynamically import jspdf to avoid SSR issues
    import("jspdf").then(({ default: jsPDF }) => {
      import("jspdf-autotable").then(({ default: autoTable }) => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text("TransitOps Fleet Analytics Report", 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const tableColumn = ["Registration", "Name", "Fuel Eff. (km/L)", "Op Cost ($)", "Revenue ($)", "ROI"];
        const tableRows = metrics.map(r => [
          r.regNumber,
          r.name,
          r.fuelEfficiency !== null ? r.fuelEfficiency.toFixed(2) : "N/A",
          r.operationalCost.toFixed(2),
          r.revenue.toFixed(2),
          `${(r.roi * 100).toFixed(2)}%`
        ]);

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 40,
          theme: "grid",
          styles: { fontSize: 10, cellPadding: 3 },
          headStyles: { fillColor: [15, 23, 42] } // slate-900
        });

        doc.save("transitops-report.pdf");
      });
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Analytics & Reports</h1>
          <p className="text-muted-foreground mt-2">
            Detailed performance, operational cost, and ROI tracking per vehicle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={exportPDF}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Export PDF
          </Button>
          <a 
            href="/api/reports/export"
            target="_blank"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <CardTitle>Return on Investment (ROI)</CardTitle>
            </div>
            <CardDescription>Ratio of Net Revenue to Acquisition Cost per vehicle.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="regNumber" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip cursor={{ fill: "transparent" }} formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, "ROI"]} />
                <Bar dataKey="roi" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <CardTitle>Operational Cost vs Revenue</CardTitle>
            </div>
            <CardDescription>Direct comparison of expenses (fuel + maintenance) vs trip revenue.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="regNumber" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip cursor={{ fill: "transparent" }} formatter={(value: number) => [`$${value.toFixed(2)}`, ""]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar name="Revenue" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar name="Cost" dataKey="operationalCost" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Raw Metrics Table</CardTitle>
          </div>
          <CardDescription>Detailed tabular view of computed KPIs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Fuel Efficiency</TableHead>
                <TableHead className="text-right">Op Cost</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No vehicles found.
                  </TableCell>
                </TableRow>
              ) : (
                metrics.map((m) => (
                  <TableRow key={m.regNumber}>
                    <TableCell>
                      <div className="font-medium">{m.regNumber}</div>
                      <div className="text-xs text-muted-foreground">{m.name}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {m.fuelEfficiency !== null ? (
                        <span className="flex items-center justify-end gap-1 text-blue-600">
                          {m.fuelEfficiency.toFixed(2)} <span className="text-xs text-muted-foreground font-normal">km/L</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">${m.operationalCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">${m.revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={m.roi >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {(m.roi * 100).toFixed(2)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
