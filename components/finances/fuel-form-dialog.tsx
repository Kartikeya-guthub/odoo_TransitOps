"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Vehicle } from "@prisma/client";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { fuelLogSchema, FuelLogFormValues } from "@/lib/validations/fuelLog";

export function FuelFormDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Explicitly fetch ALL vehicles, not just available ones
  const { data: vehicles, isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles");
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
    enabled: open,
  });

  const form = useForm<FuelLogFormValues>({
    resolver: zodResolver(fuelLogSchema),
    defaultValues: {
      vehicleId: "",
      liters: 0,
      cost: 0,
      date: new Date().toISOString().split("T")[0] as unknown as Date,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FuelLogFormValues) => {
      const res = await fetch("/api/fuel-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log fuel");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-logs"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: unknown) => {
      const errMessage = error instanceof Error ? error.message : "An error occurred";
      form.setError("root", { message: errMessage });
    }
  });

  const onSubmit = (values: FuelLogFormValues) => {
    mutation.mutate(values);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      refetchVehicles();
    } else {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Log Fuel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Fuel Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select 
                onValueChange={(val) => form.setValue("vehicleId", val)} 
                value={form.watch("vehicleId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder={vehiclesLoading ? "Loading..." : "Select Vehicle"}>
                    {vehicles?.find(v => v.id === form.watch("vehicleId")) 
                      ? `${vehicles.find(v => v.id === form.watch("vehicleId"))?.regNumber} (${vehicles.find(v => v.id === form.watch("vehicleId"))?.name})`
                      : vehiclesLoading ? "Loading..." : "Select Vehicle"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.length === 0 ? (
                    <SelectItem value="empty" disabled>No vehicles available</SelectItem>
                  ) : (
                    vehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.regNumber} ({v.name})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.vehicleId && <p className="text-sm text-destructive">{form.formState.errors.vehicleId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Liters</Label>
                <Input type="number" step="0.1" {...form.register("liters", { valueAsNumber: true })} />
                {form.formState.errors.liters && <p className="text-sm text-destructive">{form.formState.errors.liters.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input type="number" step="0.01" {...form.register("cost", { valueAsNumber: true })} />
                {form.formState.errors.cost && <p className="text-sm text-destructive">{form.formState.errors.cost.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...form.register("date")} />
              {form.formState.errors.date && <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>}
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
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
