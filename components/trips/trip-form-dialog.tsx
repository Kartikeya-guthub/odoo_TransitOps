"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Vehicle, DriverProfile } from "@prisma/client";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tripSchema, TripFormValues } from "@/lib/validations/trip";

export function TripFormDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles", "available"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles/available");
      if (!res.ok) throw new Error("Failed to fetch available vehicles");
      return res.json();
    },
    enabled: open, // only fetch when dialog is open
  });

  const { data: drivers, isLoading: driversLoading, refetch: refetchDrivers } = useQuery<DriverProfile[]>({
    queryKey: ["drivers", "available"],
    queryFn: async () => {
      const res = await fetch("/api/drivers/available");
      if (!res.ok) throw new Error("Failed to fetch available drivers");
      return res.json();
    },
    enabled: open,
  });

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      source: "",
      destination: "",
      vehicleId: "",
      driverId: "",
      cargoWeight: 0,
      plannedDistance: 0,
    },
  });

  // Watch vehicle selection to show max load capacity hint
  const selectedVehicleId = form.watch("vehicleId");
  const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);

  const mutation = useMutation({
    mutationFn: async (values: TripFormValues) => {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save trip");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: unknown) => {
      const errMessage = error instanceof Error ? error.message : "An error occurred";
      form.setError("root", { message: errMessage });
    }
  });

  const onSubmit = (values: TripFormValues) => {
    mutation.mutate(values);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      refetchVehicles();
      refetchDrivers();
    } else {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Draft Trip
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Trip (Draft)</DialogTitle>
          <DialogDescription>
            Enter trip details. This will save as a Draft. Vehicle and driver status will not be locked until Dispatch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Input placeholder="Warehouse A" {...form.register("source")} />
              {form.formState.errors.source && <p className="text-sm text-destructive">{form.formState.errors.source.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Destination</Label>
              <Input placeholder="Distribution Center B" {...form.register("destination")} />
              {form.formState.errors.destination && <p className="text-sm text-destructive">{form.formState.errors.destination.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select 
                onValueChange={(val) => form.setValue("vehicleId", val)} 
                value={form.watch("vehicleId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder={vehiclesLoading ? "Loading..." : "Select Vehicle"}>
                    {selectedVehicle ? `${selectedVehicle.regNumber} (${selectedVehicle.name})` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.length === 0 ? (
                    <SelectItem value="empty" disabled>No vehicles available</SelectItem>
                  ) : (
                    vehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.regNumber} ({v.name}) - Max: {v.maxLoadCapacity}kg
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.vehicleId && <p className="text-sm text-destructive">{form.formState.errors.vehicleId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Driver</Label>
              <Select 
                onValueChange={(val) => form.setValue("driverId", val)} 
                value={form.watch("driverId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder={driversLoading ? "Loading..." : "Select Driver"}>
                    {drivers?.find(d => d.id === form.watch("driverId"))?.name || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {drivers?.length === 0 ? (
                    <SelectItem value="empty" disabled>No eligible drivers</SelectItem>
                  ) : (
                    drivers?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.licenseCategory})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.driverId && <p className="text-sm text-destructive">{form.formState.errors.driverId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="flex justify-between">
                Cargo Weight (kg)
                {selectedVehicle && (
                  <span className="text-xs text-muted-foreground font-normal">
                    Max: {selectedVehicle.maxLoadCapacity} kg
                  </span>
                )}
              </Label>
              <Input 
                type="number" 
                {...form.register("cargoWeight", { valueAsNumber: true })} 
                className={form.watch("cargoWeight") > (selectedVehicle?.maxLoadCapacity || Infinity) ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {form.formState.errors.cargoWeight && <p className="text-sm text-destructive">{form.formState.errors.cargoWeight.message}</p>}
              {!form.formState.errors.cargoWeight && form.watch("cargoWeight") > (selectedVehicle?.maxLoadCapacity || Infinity) && (
                <p className="text-sm text-destructive">Weight exceeds vehicle capacity!</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Planned Distance (km)</Label>
              <Input type="number" {...form.register("plannedDistance", { valueAsNumber: true })} />
              {form.formState.errors.plannedDistance && <p className="text-sm text-destructive">{form.formState.errors.plannedDistance.message}</p>}
            </div>
          </div>

          {form.formState.errors.root && (
            <p className="text-sm text-destructive font-medium p-3 bg-red-50 border border-red-100 rounded-md">
              {form.formState.errors.root.message}
            </p>
          )}

          <div className="flex justify-end pt-4 gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save as Draft
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
