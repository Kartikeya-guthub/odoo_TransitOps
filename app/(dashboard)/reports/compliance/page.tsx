"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, AlertCircle, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ComplianceData = {
  id: string;
  name: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  safetyScore: number;
  status: string;
  isLicenseExpired: boolean;
  isSuspended: boolean;
  isEligible: boolean;
};

export default function CompliancePage() {
  const { data: drivers, isLoading, error } = useQuery<ComplianceData[]>({
    queryKey: ["compliance-reports"],
    queryFn: async () => {
      const res = await fetch("/api/reports/compliance");
      if (!res.ok) throw new Error("Failed to load compliance report");
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

  if (error || !drivers) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Access Denied or Error</h2>
          <p className="text-muted-foreground">Unable to load compliance reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Safety & Compliance</h1>
        <p className="text-muted-foreground mt-2">
          Driver eligibility, license tracking, and safety scores.
        </p>
      </div>

      <Card className="shadow-sm border-blue-100">
        <CardHeader className="bg-blue-50/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <CardTitle>Driver Compliance Roster</CardTitle>
          </div>
          <CardDescription>Drivers with expired licenses or suspended statuses are automatically flagged.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-6 py-4">Driver Name</TableHead>
                <TableHead>License Info</TableHead>
                <TableHead>Safety Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Eligibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No drivers found.
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="pl-6 font-medium">{d.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{d.licenseNumber}</div>
                      <div className={`text-xs mt-1 flex items-center gap-1 ${d.isLicenseExpired ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        {d.isLicenseExpired && <AlertTriangle className="h-3 w-3" />}
                        Expires: {new Date(d.licenseExpiryDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        d.safetyScore >= 80 ? "bg-emerald-100 text-emerald-700" :
                        d.safetyScore >= 60 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {d.safetyScore}/100
                      </span>
                    </TableCell>
                    <TableCell>
                      {d.isSuspended ? (
                        <span className="text-red-600 font-medium text-sm">Suspended</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">{d.status}</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {d.isEligible ? (
                        <div className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Eligible
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
                          <XCircle className="h-4 w-4" /> Ineligible
                        </div>
                      )}
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
