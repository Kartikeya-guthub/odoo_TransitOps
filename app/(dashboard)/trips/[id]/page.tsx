"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trip, Vehicle, DriverProfile, User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Truck, User as UserIcon, MapPin, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type TripWithRelations = Trip & {
  vehicle: Vehicle;
  driver: DriverProfile;
  createdBy: { email: string, role: string };
};

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState("");

  const isManager = session?.user?.role === "FLEET_MANAGER";
  const isDriver = session?.user?.role === "DRIVER";
  const canDispatch = isManager || isDriver;

  const { data: trip, isLoading, isError } = useQuery<TripWithRelations>({
    queryKey: ["trips", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch trip details");
      return res.json();
    }
  });

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      const res = await fetch(`/api/trips/${params.id}/dispatch`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch trip");
      return data;
    },
    onSuccess: () => {
      // Invalidate everything impacted by this dispatch
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles", "available"] });
      queryClient.invalidateQueries({ queryKey: ["drivers", "available"] });
    },
    onError: (error: any) => {
      setErrorMsg(error.message);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-600 border-gray-200";
      case "DISPATCHED": return "bg-blue-50 text-blue-600 border-blue-200";
      case "COMPLETED": return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "CANCELLED": return "bg-red-50 text-red-600 border-red-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4 text-center">
        <h2 className="text-xl font-semibold text-destructive">Trip not found</h2>
        <Button variant="outline" asChild>
          <Link href="/trips">Return to Trips</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/trips"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Trip Details</h1>
            <Badge variant="outline" className={getStatusColor(trip.status)}>
              {trip.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">ID: {trip.id}</p>
        </div>
        
        {/* Actions */}
        {trip.status === "DRAFT" && canDispatch && (
          <Button 
            size="lg" 
            onClick={() => dispatchMutation.mutate()} 
            disabled={dispatchMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {dispatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dispatch Trip
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800">Dispatch Failed</h3>
            <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Route Info */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-4">
            <MapPin className="h-5 w-5 text-primary" /> Route Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Source</p>
              <p className="text-lg mt-1">{trip.source}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Destination</p>
              <p className="text-lg mt-1">{trip.destination}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Planned Distance</p>
                <p className="text-base mt-1">{trip.plannedDistance} km</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Cargo Weight</p>
                <p className="text-base mt-1">{trip.cargoWeight} kg</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resources Info */}
        <div className="space-y-6">
          {/* Vehicle */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-4">
              <Truck className="h-5 w-5 text-primary" /> Assigned Vehicle
            </h2>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-lg">{trip.vehicle.regNumber}</p>
                <p className="text-muted-foreground">{trip.vehicle.name} ({trip.vehicle.type})</p>
              </div>
              <Badge variant="outline" className="bg-gray-50">
                Max Load: {trip.vehicle.maxLoadCapacity} kg
              </Badge>
            </div>
          </div>

          {/* Driver */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-4">
              <UserIcon className="h-5 w-5 text-primary" /> Assigned Driver
            </h2>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-lg">{trip.driver.name}</p>
                <p className="text-muted-foreground">License: {trip.driver.licenseNumber} ({trip.driver.licenseCategory})</p>
              </div>
              <Badge variant="outline" className="bg-gray-50">
                Score: {trip.driver.safetyScore}/100
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
