"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Vehicle } from "@prisma/client";
import { Plus, Edit2, Loader2 } from "lucide-react";

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
import { vehicleSchema, VehicleFormValues } from "@/lib/validations/vehicle";

interface VehicleFormDialogProps {
  vehicle?: Vehicle; // if provided, it's edit mode
}

export function VehicleFormDialog({ vehicle }: VehicleFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!vehicle;

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      regNumber: vehicle?.regNumber || "",
      name: vehicle?.name || "",
      type: vehicle?.type || "",
      maxLoadCapacity: vehicle?.maxLoadCapacity || 0,
      odometer: vehicle?.odometer || 0,
      acquisitionCost: vehicle?.acquisitionCost || 0,
      region: vehicle?.region || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      const res = await fetch(isEdit ? `/api/vehicles/${vehicle.id}` : "/api/vehicles", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save vehicle");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: unknown) => {
      const errMessage = error instanceof Error ? error.message : "An error occurred";
      if (errMessage.includes("Registration number must be unique")) {
        form.setError("regNumber", { message: "This registration number already exists" });
      } else {
        form.setError("root", { message: errMessage });
      }
    }
  });

  const onSubmit = (values: VehicleFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) form.reset(); // reset on close
    }}>
      <DialogTrigger render={
        isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the vehicle details below." : "Enter the details for the new vehicle."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reg Number</Label>
              <Input placeholder="TRK-2023-XYZ" {...form.register("regNumber")} />
              {form.formState.errors.regNumber && <p className="text-sm text-destructive">{form.formState.errors.regNumber.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Name / Model</Label>
              <Input placeholder="Ford Transit" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Input placeholder="Van, Truck, etc." {...form.register("type")} />
              {form.formState.errors.type && <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Input placeholder="North, South, etc." {...form.register("region")} />
              {form.formState.errors.region && <p className="text-sm text-destructive">{form.formState.errors.region.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Max Load (kg)</Label>
              <Input type="number" {...form.register("maxLoadCapacity", { valueAsNumber: true })} />
              {form.formState.errors.maxLoadCapacity && <p className="text-sm text-destructive">{form.formState.errors.maxLoadCapacity.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Odometer (km)</Label>
              <Input type="number" {...form.register("odometer", { valueAsNumber: true })} />
              {form.formState.errors.odometer && <p className="text-sm text-destructive">{form.formState.errors.odometer.message}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Acquisition Cost ($)</Label>
              <Input type="number" {...form.register("acquisitionCost", { valueAsNumber: true })} />
              {form.formState.errors.acquisitionCost && <p className="text-sm text-destructive">{form.formState.errors.acquisitionCost.message}</p>}
            </div>
          </div>

          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
