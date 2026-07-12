import { z } from "zod";

export const vehicleSchema = z.object({
  regNumber: z.string().min(1, "Registration number is required"),
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  maxLoadCapacity: z.coerce.number().min(1, "Capacity must be positive"),
  odometer: z.coerce.number().min(0, "Odometer cannot be negative"),
  acquisitionCost: z.coerce.number().min(1, "Cost must be positive"),
  region: z.string().min(1, "Region is required"),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
