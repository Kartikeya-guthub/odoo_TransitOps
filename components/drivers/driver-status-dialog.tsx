"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DriverProfile } from "@prisma/client";
import { Loader2, ShieldAlert } from "lucide-react";

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
import { driverStatusSchema, DriverStatusFormValues } from "@/lib/validations/driver";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DriverStatusDialogProps {
  driver: DriverProfile;
}

export function DriverStatusDialog({ driver }: DriverStatusDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<DriverStatusFormValues>({
    resolver: zodResolver(driverStatusSchema),
    defaultValues: {
      status: driver.status,
      safetyScore: driver.safetyScore,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: DriverStatusFormValues) => {
      const res = await fetch(`/api/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update driver status");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setOpen(false);
    },
    onError: (error: unknown) => {
      form.setError("root", { 
        message: error instanceof Error ? error.message : "An error occurred" 
      });
    }
  });

  const onSubmit = (values: DriverStatusFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) form.reset({ status: driver.status, safetyScore: driver.safetyScore });
    }}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
          <ShieldAlert className="h-4 w-4" />
        </Button>
      } />
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Safety Profile</DialogTitle>
          <DialogDescription>
            Safety Officers can update the operational status and safety score for {driver.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Operational Status</Label>
              <Select 
                onValueChange={(val) => form.setValue("status", val || "")} 
                defaultValue={form.getValues("status")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="ON_TRIP">On Trip</SelectItem>
                  <SelectItem value="OFF_DUTY">Off Duty</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>}
            </div>

            <div className="space-y-2">
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
              Save Profile
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
