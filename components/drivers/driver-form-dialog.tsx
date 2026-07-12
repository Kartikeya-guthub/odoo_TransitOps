"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DriverProfile } from "@prisma/client";
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
import { driverSchema, DriverFormValues } from "@/lib/validations/driver";
import { z } from "zod";

interface DriverFormDialogProps {
  driver?: DriverProfile; // if provided, it's edit mode
}

export function DriverFormDialog({ driver }: DriverFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!driver;

  const form = useForm<z.input<typeof driverSchema>>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      name: driver?.name || "",
      licenseNumber: driver?.licenseNumber || "",
      licenseCategory: driver?.licenseCategory || "",
      licenseExpiryDate: driver ? new Date(driver.licenseExpiryDate) : new Date(),
      contactNumber: driver?.contactNumber || "",
      safetyScore: driver?.safetyScore ?? 100,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: DriverFormValues) => {
      const res = await fetch(isEdit ? `/api/drivers/${driver.id}` : "/api/drivers", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save driver");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: unknown) => {
      const errMessage = error instanceof Error ? error.message : "An error occurred";
      form.setError("root", { message: errMessage });
    }
  });

  const onSubmit = (values: z.input<typeof driverSchema>) => {
    mutation.mutate(values as DriverFormValues);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) form.reset();
    }}>
      <DialogTrigger render={
        isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Driver
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Driver" : "Add New Driver"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the driver details below." : "Enter the details for the new driver."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Full Name</Label>
              <Input placeholder="John Doe" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input placeholder="DL-123456" {...form.register("licenseNumber")} />
              {form.formState.errors.licenseNumber && <p className="text-sm text-destructive">{form.formState.errors.licenseNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>License Category</Label>
              <Input placeholder="Class A, CDL, etc." {...form.register("licenseCategory")} />
              {form.formState.errors.licenseCategory && <p className="text-sm text-destructive">{form.formState.errors.licenseCategory.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input 
                type="date" 
                {...form.register("licenseExpiryDate", { 
                  // React Hook Form returns string for input[type=date], our Zod schema handles the transform to Date
                })} 
                // Format the default value if it's a Date object
                defaultValue={
                  form.getValues("licenseExpiryDate") instanceof Date 
                    ? (form.getValues("licenseExpiryDate") as unknown as Date).toISOString().split('T')[0] 
                    : form.getValues("licenseExpiryDate") as unknown as string
                }
              />
              {form.formState.errors.licenseExpiryDate && <p className="text-sm text-destructive">{form.formState.errors.licenseExpiryDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input placeholder="+1 234 567 8900" {...form.register("contactNumber")} />
              {form.formState.errors.contactNumber && <p className="text-sm text-destructive">{form.formState.errors.contactNumber.message}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Safety Score (0-100)</Label>
              <Input type="number" {...form.register("safetyScore", { valueAsNumber: true })} />
              {form.formState.errors.safetyScore && <p className="text-sm text-destructive">{form.formState.errors.safetyScore.message}</p>}
            </div>
          </div>

          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Driver"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
