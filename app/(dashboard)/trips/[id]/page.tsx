"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trip, Vehicle, DriverProfile, User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Truck, User as UserIcon, MapPin, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    finalOdometer: 0,
    fuelConsumed: 0,
    fuelCost: 0,
    revenue: 0,
  });

  const isManager = session?.user?.role === "FLEET_MANAGER";
  const isDriver = session?.user?.role === "DISPATCHER";
  const canModify = isManager || isDriver;

  const { data: trip, isLoading, isError } = useQuery<TripWithRelations>({
    queryKey: ["trips", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch trip details");
      return res.json();
    }
  });

  const invalidateEverything = () => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["drivers"] });
    queryClient.invalidateQueries({ queryKey: ["vehicles", "available"] });
    queryClient.invalidateQueries({ queryKey: ["drivers", "available"] });
  };

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
    onSuccess: invalidateEverything,
    onError: (error: any) => setErrorMsg(error.message)
  });

  const completeMutation = useMutation({
    mutationFn: async (payload: typeof completeForm) => {
      setErrorMsg("");
      const res = await fetch(`/api/trips/${params.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete trip");
      return data;
    },
    onSuccess: () => {
      invalidateEverything();
      setCompleteOpen(false);
    },
    onError: (error: any) => setErrorMsg(error.message)
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      const res = await fetch(`/api/trips/${params.id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel trip");
      return data;
    },
    onSuccess: invalidateEverything,
    onError: (error: any) => setErrorMsg(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      const res = await fetch(`/api/trips/${params.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete draft trip");
    },
    onSuccess: () => {
      invalidateEverything();
      router.push("/trips");
    },
    onError: (error: any) => setErrorMsg(error.message)
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
        
        {/* Actions based on State */}
        {trip.status === "DRAFT" && canModify && (
          <div className="flex gap-2">
            <Button 
              size="lg" 
              variant="destructive"
              onClick={() => deleteMutation.mutate()} 
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Draft
            </Button>
            
            <Button 
              size="lg" 
              onClick={() => dispatchMutation.mutate()} 
              disabled={dispatchMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {dispatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Dispatch Trip
            </Button>
          </div>
        )}

        {trip.status === "DISPATCHED" && canModify && (
          <div className="flex gap-2">
            {/* Cancel Trip AlertDialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                  Cancel Trip
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately cancel the trip and return the vehicle ({trip.vehicle.regNumber}) and driver ({trip.driver.name}) to the available pool. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go back</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancelMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                    {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Cancellation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Complete Trip Dialog */}
            <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                  Complete Trip
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Complete Trip</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Final Odometer (km)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={completeForm.finalOdometer || ""}
                        onChange={(e) => setCompleteForm({...completeForm, finalOdometer: parseFloat(e.target.value) || 0})}
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        Current: {trip.vehicle.odometer} km
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fuel Consumed (Liters)</Label>
                      <Input 
                        type="number" 
                        value={completeForm.fuelConsumed || ""}
                        onChange={(e) => setCompleteForm({...completeForm, fuelConsumed: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Fuel Cost ($)</Label>
                      <Input 
                        type="number" 
                        value={completeForm.fuelCost || ""}
                        onChange={(e) => setCompleteForm({...completeForm, fuelCost: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Trip Revenue ($)</Label>
                    <Input 
                      type="number" 
                      value={completeForm.revenue || ""}
                      onChange={(e) => setCompleteForm({...completeForm, revenue: parseFloat(e.target.value) || 0})}
                    />
                    <p className="text-xs text-muted-foreground">
                      This revenue figure will be used for ROI calculations.
                    </p>
                  </div>
                  <Button 
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700" 
                    onClick={() => completeMutation.mutate(completeForm)}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Completion
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800">Action Failed</h3>
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
            {(trip.status === "COMPLETED") && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t bg-emerald-50/50 p-4 rounded-md">
                <div>
                  <p className="text-sm text-emerald-800 font-medium">Actual Distance</p>
                  <p className="text-base mt-1 text-emerald-900">{trip.actualDistance} km</p>
                </div>
                <div>
                  <p className="text-sm text-emerald-800 font-medium">Revenue</p>
                  <p className="text-base mt-1 text-emerald-900">${trip.revenue}</p>
                </div>
              </div>
            )}
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
